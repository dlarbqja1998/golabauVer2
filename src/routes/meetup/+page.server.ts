// =========================================================
//  [src/routes/meetup/+page.server.ts]
//  쿠키 검증 + 정보 미입력자 입구컷 방어 로직 추가
// =========================================================
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { rooms, users } from '../../db/schema';
import { desc, eq, and, gt, sql } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

const CACHE_KEY = 'active_meetup_rooms';

export const load: PageServerLoad = async ({ cookies, platform }) => {
    // 🔥 1. 쿠키 직접 확인해서 로그인 안 했으면 컷
    const sessionId = cookies.get('session_id');
    if (!sessionId) {
        throw redirect(302, '/login');
    }

    const userId = parseInt(sessionId);
    const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    if (!currentUser) {
        throw redirect(302, '/login');
    }

    // 🔥 2. URL 직접 치고 들어온 얌체 유저 방어 (필수 정보 없으면 마이페이지로 컷!)
    const hasMajor = !!(currentUser.college && currentUser.department);
    const hasContact = !!(currentUser.kakaoId || currentUser.instaId);
    
    if (!currentUser.grade || !currentUser.gender || !hasMajor || !hasContact) {
        throw redirect(302, '/my?error=meetup_profile');
    }

    // --- 아래는 기존 KV 최적화 로직과 100% 동일합니다 ---
    const kv = platform?.env?.GOLABAU_CACHE;

    let activeRooms: any[] = [];
    if (kv) {
        const cachedRooms = await kv.get(CACHE_KEY, 'json');
        if (cachedRooms) {
            console.log('⚡ KV 캐시 히트 (OPEN 방)');
            activeRooms = cachedRooms as any[];
        }
    }

    const now = new Date().toISOString();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    if (activeRooms.length === 0) {
        console.log('🐢 KV 캐시 미스! DB에서 OPEN 방을 긁어옵니다...');
        const res = await db.execute(sql`
            SELECT r.id, r.title, r.appointment_time as "appointmentTime", r.restaurant_name as "restaurantName",
                   r.meeting_type as "meetingType", r.gender_condition as "genderCondition", r.headcount_condition as "headcountCondition",
                   r.bumped_at as "bumpedAt", r.status,
                   u.grade as "creatorGrade", u.gender as "creatorGender"
            FROM rooms r
            JOIN "user" u ON r.creator_id = u.id
            WHERE r.status = 'OPEN' AND r.appointment_time > ${now}
            ORDER BY r.bumped_at DESC
        `);

        activeRooms = res.rows.map(row => ({
            id: Number(row.id),
            title: String(row.title),
            appointmentTime: String(row.appointmentTime),
            restaurantName: String(row.restaurantName),
            meetingType: String(row.meetingType),
            genderCondition: String(row.genderCondition),
            headcountCondition: String(row.headcountCondition),
            bumpedAt: String(row.bumpedAt),
            status: String(row.status),
            creatorGrade: row.creatorGrade ? String(row.creatorGrade) : null,
            creatorGender: row.creatorGender ? String(row.creatorGender) : null
        }));

        if (kv) {
            await kv.put(CACHE_KEY, JSON.stringify(activeRooms), {
                expirationTtl: 60
            });
        }
    }

    // 🔥 3. 내 방 및 완료(매칭)된 방 별도 조회 (글로벌 캐싱 방지!)
    const matchedRes = await db.execute(sql`
        SELECT DISTINCT r.id, r.title, r.appointment_time as "appointmentTime", r.restaurant_name as "restaurantName",
               r.meeting_type as "meetingType", r.gender_condition as "genderCondition", r.headcount_condition as "headcountCondition",
               r.bumped_at as "bumpedAt", r.status,
               u.grade as "creatorGrade", u.gender as "creatorGender"
        FROM rooms r
        LEFT JOIN room_requests req ON r.id = req.room_id
        JOIN "user" u ON r.creator_id = u.id
        WHERE (r.creator_id = ${userId} OR req.requester_id = ${userId})
          AND (
              (r.status = 'OPEN' AND r.appointment_time > ${now}) OR
              (r.status = 'MATCHED' AND r.bumped_at > ${thirtyMinsAgo})
          )
        ORDER BY r.bumped_at DESC
    `);
    
    // DB raw rows 변환
    const myRooms = matchedRes.rows.map(row => ({
        id: Number(row.id),
        title: String(row.title),
        appointmentTime: String(row.appointmentTime),
        restaurantName: String(row.restaurantName),
        meetingType: String(row.meetingType),
        genderCondition: String(row.genderCondition),
        headcountCondition: String(row.headcountCondition),
        bumpedAt: String(row.bumpedAt),
        status: String(row.status),
        creatorGrade: row.creatorGrade ? String(row.creatorGrade) : null,
        creatorGender: row.creatorGender ? String(row.creatorGender) : null
    }));

    return { user: currentUser, rooms: activeRooms, myRooms };
};