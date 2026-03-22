import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { rooms, users } from '../../db/schema';
import { eq, and, desc, gt, sql } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import { getUserIdFromSessionToken } from '$lib/server/user';

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session_id');
    if (!sessionId) throw redirect(302, '/login');

    const userId = getUserIdFromSessionToken(sessionId);
    if (!userId) throw redirect(302, '/login');

    const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, nickname: true, points: true }
    });

    if (!currentUser) throw redirect(302, '/login');

    const myRooms = await db.query.rooms.findMany({
        where: and(
            eq(rooms.creatorId, userId),
            eq(rooms.status, 'OPEN'),
            gt(rooms.appointmentTime, new Date().toISOString())
        ),
        orderBy: [desc(rooms.createdAt)],
        columns: { id: true, title: true, bumpedAt: true, appointmentTime: true }
    });

    return { user: currentUser, myRooms };
};

export const actions: Actions = {
    bump: async ({ request, cookies, platform }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) return fail(401, { message: '로그인이 필요합니다.' });

        const userId = getUserIdFromSessionToken(sessionId);
        if (!userId) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const roomId = parseInt(data.get('roomId') as string);

        if (!roomId) return fail(400, { message: '방을 선택해 주세요.' });

        try {
            const room = await db.query.rooms.findFirst({
                where: eq(rooms.id, roomId)
            });

            if (!room || room.creatorId !== userId || room.status !== 'OPEN') {
                throw new Error('선택한 방이 유효하지 않습니다.');
            }

            if (new Date(room.appointmentTime) <= new Date()) {
                throw new Error('이미 만료된 방입니다.');
            }

            const bumpedAt = new Date().toISOString();
            const result = await db.execute(sql`
                WITH updated_user AS (
                    UPDATE "user"
                    SET points = points - 50
                    WHERE id = ${userId}
                      AND points >= 50
                    RETURNING id
                ),
                updated_room AS (
                    UPDATE rooms
                    SET bumped_at = ${bumpedAt}
                    WHERE id = ${roomId}
                      AND creator_id = ${userId}
                      AND status = 'OPEN'
                      AND appointment_time > NOW()
                      AND EXISTS (SELECT 1 FROM updated_user)
                    RETURNING id
                ),
                inserted_log AS (
                    INSERT INTO point_logs (user_id, amount, reason)
                    SELECT ${userId}, -50, '매칭가속티켓 사용'
                    WHERE EXISTS (SELECT 1 FROM updated_room)
                    RETURNING id
                )
                SELECT
                    EXISTS (SELECT 1 FROM updated_user) AS user_updated,
                    EXISTS (SELECT 1 FROM updated_room) AS room_updated,
                    EXISTS (SELECT 1 FROM inserted_log) AS log_inserted
            `);

            const mutation = result.rows[0] as
                | { user_updated?: boolean; room_updated?: boolean; log_inserted?: boolean }
                | undefined;

            if (!mutation?.user_updated) {
                throw new Error('포인트가 부족합니다.');
            }

            if (!mutation.room_updated || !mutation.log_inserted) {
                throw new Error('사용에 실패했습니다. 포인트와 방 상태를 다시 확인해 주세요.');
            }

            await Promise.allSettled([
                platform?.env?.GOLABAU_CACHE?.delete('active_meetup_rooms'),
                platform?.env?.GOLABAU_CACHE?.delete(`meetup_room:${roomId}`)
            ]);

            return { success: true };
        } catch (error) {
            console.error('BUMP ERROR:', error);
            return fail(400, { message: (error as Error).message || '오류가 발생했습니다.' });
        }
    }
};
