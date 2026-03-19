import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { deleteKVCache } from '$lib/server/cache';
import { getUserBySessionId, getUserIdFromSessionToken, getUserCacheKey } from '$lib/server/user';

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session_id');
    if (!sessionId) throw redirect(303, '/login');

    const userId = getUserIdFromSessionToken(sessionId);
    if (!userId) throw redirect(303, '/login');

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user && user.isOnboarded) throw redirect(303, '/my');

    return { user };
};

export const actions: Actions = {
    default: async ({ request, cookies, platform }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) throw redirect(303, '/login');

        const sessionUser = await getUserBySessionId(platform, sessionId);
        if (!sessionUser) throw redirect(303, '/login');

        const formData = await request.formData();
        const nickname = formData.get('nickname')?.toString().trim();
        const college = formData.get('college') as string;
        const department = formData.get('department') as string;
        const grade = formData.get('grade') as string;
        const birthYear = formData.get('birthYear');
        const gender = formData.get('gender') as string;
        const kakaoId = formData.get('kakaoId')?.toString().trim() || null;
        const instaId = formData.get('instaId')?.toString().trim() || null;

        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            return fail(400, { message: '닉네임은 2글자 이상, 10글자 이하로 입력해주세요.' });
        }

        await db
            .update(users)
            .set({
                nickname,
                college,
                department,
                grade,
                gender,
                birthYear: birthYear ? parseInt(birthYear.toString()) : null,
                kakaoId,
                instaId,
                isOnboarded: true
            })
            .where(eq(users.id, sessionUser.id));

        await deleteKVCache(platform, getUserCacheKey(sessionUser.id));

        throw redirect(303, '/my');
    }
};
