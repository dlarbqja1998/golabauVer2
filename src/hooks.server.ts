import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
    // 1. 쿠키에서 세션 ID 가져오기
    const sessionId = event.cookies.get('session_id');

    if (!sessionId) {
        // 로그인 안 했으면 그냥 통과
        return await resolve(event);
    }

    // 2. DB에서 유저 찾기
    const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(sessionId))
    });

    // 3. 유저가 있으면 event.locals에 저장 (서버 전역에서 사용 가능해짐)
    if (user) {
        event.locals.user = {
            id: user.id,
            nickname: user.nickname,
            email: user.email,
            profileImg: user.profileImg,
            badge: user.badge
        };
    }

    return await resolve(event);
};