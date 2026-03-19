// =========================================================
//  [src/routes/meetup/[roomId]/+page.server.ts]
//  타입스크립트 빨간줄 (Type Error) 완벽 제거 버전
// =========================================================
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import { sendPushNotification } from '$lib/server/push';

const LIST_CACHE_KEY = 'active_meetup_rooms';
const MATCHED_ROOM_TTL_MS = 60 * 60 * 1000;

function getRoomCacheKey(roomId: number) {
    return `meetup_room:${roomId}`;
}

function isExpiredMatchedRoom(status: string, matchedAt: string | null) {
    if (status !== 'MATCHED' || !matchedAt) return false;

    const matchedAtMs = new Date(matchedAt).getTime();
    if (Number.isNaN(matchedAtMs)) return false;

    return Date.now() - matchedAtMs >= MATCHED_ROOM_TTL_MS;
}

async function invalidateMeetupCaches(platform: App.Platform | undefined, roomId: number) {
    const kv = platform?.env?.GOLABAU_CACHE;
    if (!kv) return;
    await Promise.allSettled([
        kv.delete(LIST_CACHE_KEY),
        kv.delete(getRoomCacheKey(roomId))
    ]);
}

export const load: PageServerLoad = async ({ params, locals, url, platform }) => {
    if (!locals.user) throw redirect(302, '/login');

    const roomId = Number(params.roomId);
    if (!Number.isInteger(roomId) || roomId <= 0) {
        throw redirect(302, '/meetup?error=invalid_room');
    }

    const isAdmin = locals.user.role === 'admin';
    const isTestMode = isAdmin && url.searchParams.get('test') === 'participant';
    const kv = platform?.env?.GOLABAU_CACHE;
    const cacheKey = getRoomCacheKey(roomId);

    type CachedRoomPayload = {
        id: number; creatorId: number; title: string; appointmentTime: string;
        restaurantId: number | null; restaurantName: string; meetingType: string; genderCondition: string;
        headcountCondition: string; contactType: string | null; contactId: string | null;
        matchedAt: string | null;
        status: string; creatorNickname: string; creatorProfileImg: string | null;
        creatorGrade: string | null; creatorGender: string | null; creatorDepartment: string | null;
        appliedReq: { id: number; requesterId: number; status: string; nickname: string; department: string | null; grade: string | null; gender: string | null; contactType: string | null; } | null;
    };

    let payload: CachedRoomPayload | null = null;
    if (kv) {
        payload = await kv.get<CachedRoomPayload>(cacheKey, 'json');
    }

    if (!payload) {
        try {
            const roomResult = await db.execute(sql`
                SELECT r.id, r.creator_id, r.title, r.appointment_time, r.restaurant_id, r.restaurant_name, 
                       r.meeting_type, r.gender_condition, r.headcount_condition, r.contact_type, 
                       r.contact_id, r.status, r.bumped_at,
                       u.nickname AS creator_nickname, u.profile_img AS creator_profile_img,
                       u.grade AS creator_grade, u.gender AS creator_gender, u.department AS creator_department
                FROM rooms r JOIN "user" u ON r.creator_id = u.id
                WHERE r.id = ${roomId} LIMIT 1
            `);

            const rawRoom = roomResult.rows[0] as Record<string, any> | undefined;
            if (!rawRoom || (rawRoom.status !== 'OPEN' && rawRoom.status !== 'MATCHED')) {
                throw redirect(302, '/meetup?error=not_found');
            }

            // 🔥 TypeScript가 안심하도록 명시적 타입 지정 (CachedRoomPayload['appliedReq'])
            let appliedReq: CachedRoomPayload['appliedReq'] = null;
            
            try {
                const reqResult = await db.execute(sql`
                    SELECT rr.id AS request_id, rr.requester_id, rr.status AS request_status, 
                           ru.nickname AS requester_nickname, ru.grade AS requester_grade,
                           ru.gender AS requester_gender, ru.department AS requester_department,
                           ru.kakao_id, ru.insta_id
                    FROM room_requests rr JOIN "user" ru ON rr.requester_id = ru.id
                    WHERE rr.room_id = ${roomId} LIMIT 1
                `);
                const rawReq = reqResult.rows[0];
                if (rawReq) {
                    let reqContactType = null;
                    if (rawReq.kakao_id) reqContactType = 'KAKAO';
                    else if (rawReq.insta_id) reqContactType = 'INSTA';

                    appliedReq = {
                        id: Number(rawReq.request_id), 
                        requesterId: Number(rawReq.requester_id), 
                        status: String(rawReq.request_status),
                        nickname: String(rawReq.requester_nickname ?? '익명'), 
                        department: rawReq.requester_department ? String(rawReq.requester_department) : null, 
                        grade: rawReq.requester_grade ? String(rawReq.requester_grade) : null,
                        gender: rawReq.requester_gender ? String(rawReq.requester_gender) : null,
                        contactType: reqContactType
                    };
                }
            } catch (e) { console.log("참여자 조회 실패"); }

            payload = {
                id: Number(rawRoom.id), 
                creatorId: Number(rawRoom.creator_id), 
                title: String(rawRoom.title),
                appointmentTime: String(rawRoom.appointment_time), 
                restaurantId: rawRoom.restaurant_id ? Number(rawRoom.restaurant_id) : null,
                restaurantName: String(rawRoom.restaurant_name),
                meetingType: String(rawRoom.meeting_type), 
                genderCondition: String(rawRoom.gender_condition),
                headcountCondition: String(rawRoom.headcount_condition), 
                contactType: rawRoom.contact_type ? String(rawRoom.contact_type) : null,
                contactId: rawRoom.contact_id ? String(rawRoom.contact_id) : null, 
                matchedAt: rawRoom.bumped_at ? String(rawRoom.bumped_at) : null,
                status: String(rawRoom.status), 
                creatorNickname: String(rawRoom.creator_nickname), 
                creatorProfileImg: rawRoom.creator_profile_img ? String(rawRoom.creator_profile_img) : null,
                creatorGrade: rawRoom.creator_grade ? String(rawRoom.creator_grade) : null, 
                creatorGender: rawRoom.creator_gender ? String(rawRoom.creator_gender) : null, 
                creatorDepartment: rawRoom.creator_department ? String(rawRoom.creator_department) : null,
                appliedReq: appliedReq
            };

            if (kv) await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 60 });
        } catch (e) {
            console.error('방 정보 조회 에러:', e);
            if (e instanceof Response) throw e;
            throw redirect(302, '/meetup?error=db_error');
        }
    }

    if (!payload) throw redirect(302, '/meetup?error=not_found');

    if (isExpiredMatchedRoom(payload.status, payload.matchedAt)) {
        await invalidateMeetupCaches(platform, roomId);
        throw redirect(302, '/meetup?error=expired');
    }

    const requesterId = payload.appliedReq?.requesterId ?? null;
    const isCreator = locals.user.id === payload.creatorId && !isTestMode;
    const isApplicant = requesterId === locals.user.id || isTestMode;

    if (payload.status === 'MATCHED' && !isCreator && !isApplicant && !isAdmin) {
        throw redirect(302, '/meetup?error=forbidden');
    }

    const canSeeContact = payload.status === 'MATCHED' && (isCreator || isApplicant || isAdmin);

    const room = {
        id: payload.id, title: payload.title, appointmentTime: payload.appointmentTime,
        restaurantId: payload.restaurantId, restaurantName: payload.restaurantName, meetingType: payload.meetingType,
        genderCondition: payload.genderCondition, headcountCondition: payload.headcountCondition,
        contactType: payload.contactType, // 연락처 종류(카카오/인스타)는 항상 표시
        contactId: canSeeContact ? payload.contactId : null,
        matchedAt: payload.status === 'MATCHED' ? payload.matchedAt : null,
        status: payload.status, creatorNickname: payload.creatorNickname,
        creatorGrade: payload.creatorGrade, creatorGender: payload.creatorGender, creatorDepartment: payload.creatorDepartment
    };

    return { user: locals.user, room, isCreator, appliedReq: payload.appliedReq };
};

export const actions: Actions = {
    // deleteRoom, apply, confirm 액션은 기존과 동일하게 유지! (아래 생략)
    deleteRoom: async ({ params, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        const roomId = Number(params.roomId);

        try {
            const roomResult = await db.execute(sql`SELECT creator_id FROM rooms WHERE id = ${roomId} LIMIT 1`);
            const room = roomResult.rows[0];
            if (!room) return fail(404, { message: '이미 없어진 방입니다.' });

            if (Number(room.creator_id) !== locals.user.id && locals.user.role !== 'admin') {
                return fail(403, { message: '권한이 없습니다.' });
            }

            try { await db.execute(sql`DELETE FROM room_requests WHERE room_id = ${roomId}`); } catch(e){}
            await db.execute(sql`DELETE FROM rooms WHERE id = ${roomId}`);
            await invalidateMeetupCaches(platform, roomId);
            throw redirect(303, '/meetup');
        } catch (error) {
            if (error instanceof Response) throw error;
            return fail(500, { message: '서버 에러가 발생했습니다.' });
        }
    },

    apply: async ({ params, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        const roomId = Number(params.roomId);

        try {
            const roomResult = await db.execute(sql`SELECT creator_id, status FROM rooms WHERE id = ${roomId} LIMIT 1`);
            const room = roomResult.rows[0];
            if (!room || room.status !== 'OPEN') return fail(404, { message: '참가할 수 없는 방입니다.' });
            if (Number(room.creator_id) === locals.user.id) return fail(400, { message: '본인 방에는 참가 불가!' });

            const existReq = await db.execute(sql`SELECT id FROM room_requests WHERE room_id = ${roomId} LIMIT 1`);
            if (existReq.rows.length > 0) return fail(400, { message: '이미 참가자가 있습니다!' });

            await db.execute(sql`INSERT INTO room_requests (room_id, requester_id, status) VALUES (${roomId}, ${locals.user.id}, 'PENDING')`);
            await invalidateMeetupCaches(platform, roomId);

            return { success: true, message: '참가 완료!' };
        } catch (error) {
            return fail(500, { message: '서버 에러가 발생했습니다.' });
        }
    },

    confirm: async ({ params, locals, url, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        const roomId = Number(params.roomId);
        const isTestMode = locals.user.role === 'admin' && url.searchParams.get('test') === 'participant';

        try {
            const roomResult = await db.execute(sql`SELECT creator_id, status FROM rooms WHERE id = ${roomId} LIMIT 1`);
            const room = roomResult.rows[0];
            if (!room) return fail(404, { message: '방이 존재하지 않습니다.' });

            const reqResult = await db.execute(sql`SELECT id, requester_id, status FROM room_requests WHERE room_id = ${roomId} LIMIT 1`);
            const req = reqResult.rows[0];
            if (!req) return fail(400, { message: '참가자가 없습니다.' });

            const isCreator = Number(room.creator_id) === locals.user.id && !isTestMode;
            const isApplicant = Number(req.requester_id) === locals.user.id || isTestMode;

            if (!isCreator && !isApplicant && locals.user.role !== 'admin') return fail(403, { message: '권한이 없습니다.' });

            let pushTarget: number | null = null;
            let pushTitle = '';
            let pushBody = '';
            let newStatus = String(req.status);
            let isMatchComplete = false;

            if (isCreator) {
                if (req.status === 'APPLICANT_READY') { 
                    newStatus = 'MATCHED'; isMatchComplete = true; 
                    pushTarget = Number(req.requester_id);
                    pushTitle = '매칭 성사 완료!';
                    pushBody = '접속해서 연락처를 확인하세요!';
                } 
                else if (req.status === 'PENDING') {
                    newStatus = 'HOST_READY';
                    pushTarget = Number(req.requester_id);
                    pushTitle = '방장이 준비 됐어요!';
                    pushBody = '접속해서 확인을 눌러주세요!';
                }
            } else {
                if (req.status === 'HOST_READY') { 
                    newStatus = 'MATCHED'; isMatchComplete = true; 
                    pushTarget = Number(room.creator_id);
                    pushTitle = '매칭 성사 완료!';
                    pushBody = '접속해서 연락처를 확인하세요!';
                } 
                else if (req.status === 'PENDING') {
                    newStatus = 'APPLICANT_READY';
                    pushTarget = Number(room.creator_id);
                    pushTitle = '상대방이 준비 됐어요!';
                    pushBody = '접속해서 확인을 눌러주세요!';
                }
            }

            await db.execute(sql`UPDATE room_requests SET status = ${newStatus} WHERE id = ${req.id}`);
            if (isMatchComplete) await db.execute(sql`UPDATE rooms SET status = 'MATCHED', bumped_at = NOW() WHERE id = ${roomId}`);
            
            await invalidateMeetupCaches(platform, roomId);

            // [푸시 알림 비동기 백그라운드 발송]
            if (pushTarget) {
                sendPushNotification(pushTarget, pushTitle, pushBody, `/meetup/${roomId}`).catch(e => console.error("Confirm Push Error:", e));
            }

            return { success: true, message: isMatchComplete ? '매칭 성공! 🎉' : '준비 완료!' };
        } catch (error) {
            return fail(500, { message: '서버 에러가 발생했습니다.' });
        }
    },

    cancelApply: async ({ params, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        const roomId = Number(params.roomId);

        try {
            const reqResult = await db.execute(sql`SELECT id, requester_id, status FROM room_requests WHERE room_id = ${roomId} LIMIT 1`);
            const req = reqResult.rows[0];
            if (!req) return fail(400, { message: '참가 내역이 없습니다.' });

            if (Number(req.requester_id) !== locals.user.id && locals.user.role !== 'admin') {
                return fail(403, { message: '권한이 없습니다.' });
            }

            if (req.status === 'MATCHED') {
                return fail(400, { message: '매칭이 성사된 방은 참가 취소가 불가능합니다.' });
            }

            await db.execute(sql`DELETE FROM room_requests WHERE id = ${req.id}`);
            await invalidateMeetupCaches(platform, roomId);
            return { success: true, message: '참가를 취소했습니다.' };
        } catch (error) {
            return fail(500, { message: '서버 에러가 발생했습니다.' });
        }
    },

    cancelReady: async ({ params, locals, url, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        const roomId = Number(params.roomId);
        const isTestMode = locals.user.role === 'admin' && url.searchParams.get('test') === 'participant';

        try {
            const roomResult = await db.execute(sql`SELECT creator_id FROM rooms WHERE id = ${roomId} LIMIT 1`);
            const room = roomResult.rows[0];
            if (!room) return fail(404, { message: '방이 존재하지 않습니다.' });

            const reqResult = await db.execute(sql`SELECT id, requester_id, status FROM room_requests WHERE room_id = ${roomId} LIMIT 1`);
            const req = reqResult.rows[0];
            if (!req) return fail(400, { message: '참가자가 없습니다.' });

            const isCreator = Number(room.creator_id) === locals.user.id && !isTestMode;
            const isApplicant = Number(req.requester_id) === locals.user.id || isTestMode;

            if (!isCreator && !isApplicant && locals.user.role !== 'admin') return fail(403, { message: '권한이 없습니다.' });

            if (req.status === 'MATCHED') {
                return fail(400, { message: '매칭이 성사된 방은 준비 취소가 불가능합니다.' });
            }

            if (isCreator && req.status === 'HOST_READY') {
                await db.execute(sql`UPDATE room_requests SET status = 'PENDING' WHERE id = ${req.id}`);
            } else if (isApplicant && req.status === 'APPLICANT_READY') {
                await db.execute(sql`UPDATE room_requests SET status = 'PENDING' WHERE id = ${req.id}`);
            } else {
                return fail(400, { message: '취소할 확인 내역이 없습니다.' });
            }

            await invalidateMeetupCaches(platform, roomId);
            return { success: true, message: '확인을 취소했습니다.' };
        } catch (error) {
            return fail(500, { message: '서버 에러가 발생했습니다.' });
        }
    }
};
