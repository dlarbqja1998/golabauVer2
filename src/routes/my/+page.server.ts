import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types'; // 👈 이 줄 추가 (타입 해결)
import { db } from '$lib/server/db';
import { users, golabassyuPosts } from '../../db/schema'; // 👈 경로 수정 ($db -> 상대경로)
import { eq, desc } from 'drizzle-orm';

// 👈 여기에 ': PageServerLoad' 추가
export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session_id');

    if (!sessionId) {
        throw redirect(303, '/login'); 
    }

    const userId = parseInt(sessionId);

    const userInfo = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    if (!userInfo) {
        cookies.delete('session_id', { path: '/' });
        throw redirect(303, '/login');
    }

    const myPosts = await db.query.golabassyuPosts.findMany({
        where: eq(golabassyuPosts.userId, userId),
        orderBy: [desc(golabassyuPosts.createdAt)]
    });

    return { user: userInfo, myPosts };
};

// 👈 여기에 ': Actions' 추가
export const actions: Actions = {
    logout: async ({ cookies }) => {
        cookies.delete('session_id', { path: '/' });
        throw redirect(303, '/');
    }
};