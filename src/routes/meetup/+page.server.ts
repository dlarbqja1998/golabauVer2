// =========================================================
//  [src/routes/meetup/+page.server.ts]
//  쿠키 검증 + 프로필 조건 검증 + 방 목록 캐시
// =========================================================
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { isMeetupProfileComplete } from '$lib/server/user';

const CACHE_KEY = 'active_meetup_rooms';

export const load: PageServerLoad = async ({ locals, platform }) => {
    const currentUser = locals.user;
    if (!currentUser) {
        throw redirect(302, '/login');
    }

    if (!isMeetupProfileComplete(currentUser)) {
        throw redirect(302, '/my?error=meetup_profile');
    }

    const kv = platform?.env?.GOLABAU_CACHE;
    let activeRooms: any[] = [];

    if (kv) {
        const cachedRooms = await kv.get(CACHE_KEY, 'json');
        if (cachedRooms) {
            activeRooms = cachedRooms as any[];
        }
    }

    const now = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    if (activeRooms.length === 0) {
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

        activeRooms = res.rows.map((row) => ({
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

    const matchedRes = await db.execute(sql`
        SELECT DISTINCT r.id, r.title, r.appointment_time as "appointmentTime", r.restaurant_name as "restaurantName",
               r.meeting_type as "meetingType", r.gender_condition as "genderCondition", r.headcount_condition as "headcountCondition",
               r.bumped_at as "bumpedAt", r.status,
               u.grade as "creatorGrade", u.gender as "creatorGender"
        FROM rooms r
        LEFT JOIN room_requests req ON r.id = req.room_id
        JOIN "user" u ON r.creator_id = u.id
        WHERE (r.creator_id = ${currentUser.id} OR req.requester_id = ${currentUser.id})
          AND (
              (r.status = 'OPEN' AND r.appointment_time > ${now}) OR
              (r.status = 'MATCHED' AND r.bumped_at > ${oneHourAgo})
          )
        ORDER BY r.bumped_at DESC
    `);

    const myRooms = matchedRes.rows.map((row) => ({
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
