import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { rooms, users, pointLogs } from '../../db/schema';
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
        where: and(eq(rooms.creatorId, userId), eq(rooms.status, 'OPEN'), gt(rooms.appointmentTime, new Date().toISOString())),
        orderBy: [desc(rooms.createdAt)],
        columns: { id: true, title: true, bumpedAt: true, appointmentTime: true }
    });

    return { user: currentUser, myRooms };
};

export const actions: Actions = {
    bump: async ({ request, cookies }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) return fail(401, { message: '로그인이 필요합니다.' });

        const userId = getUserIdFromSessionToken(sessionId);
        if (!userId) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const roomId = parseInt(data.get('roomId') as string);

        if (!roomId) return fail(400, { message: '방이 선택되지 않았습니다.' });

        try {
            const currentUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
                columns: { points: true }
            });

            if (!currentUser || (currentUser.points ?? 0) < 50) {
                throw new Error('포인트가 부족합니다!');
            }

            const room = await db.query.rooms.findFirst({
                where: eq(rooms.id, roomId)
            });

            if (!room || room.creatorId !== userId || room.status !== 'OPEN') {
                throw new Error('선택한 방이 유효하지 않습니다.');
            }

            if (new Date(room.appointmentTime) <= new Date()) {
                throw new Error('이미 만료된 방입니다.');
            }

            await db.update(users).set({ points: sql`${users.points} - 50` }).where(eq(users.id, userId));

            await db.insert(pointLogs).values({
                userId,
                amount: -50,
                reason: '매칭가속티켓 사용'
            });

            await db.update(rooms).set({ bumpedAt: new Date().toISOString() }).where(eq(rooms.id, roomId));

            return { success: true };
        } catch (e: any) {
            console.error('BUMP ERROR:', e);
            return fail(400, { message: e.message || '오류가 발생했습니다.' });
        }
    }
};
