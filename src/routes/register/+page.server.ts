import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { deleteKVCache } from '$lib/server/cache';

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session_id');
    if (!sessionId) throw redirect(303, '/login');
    const userId = parseInt(sessionId);
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (user && user.isOnboarded) throw redirect(303, '/my');
    return { user };
};

export const actions: Actions = {
    default: async ({ request, cookies, platform }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) throw redirect(303, '/login');

        const formData = await request.formData();
        const nickname = formData.get('nickname')?.toString().trim();
        const college = formData.get('college') as string;
        const department = formData.get('department') as string;
        const grade = formData.get('grade') as string;
        const birthYear = formData.get('birthYear');
        const gender = formData.get('gender') as string;
        const kakaoId = formData.get('kakaoId')?.toString().trim() || null; // 🔥 추가
        const instaId = formData.get('instaId')?.toString().trim() || null; // 🔥 추가

        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            return fail(400, { message: '닉네임은 2글자 이상, 10글자 이하로 입력해주세요.' });
        }

        await db.update(users)
            .set({
                nickname, college, department, grade, gender,
                birthYear: birthYear ? parseInt(birthYear.toString()) : null,
                kakaoId, instaId, // 🔥 추가
                isOnboarded: true
            })
            .where(eq(users.id, parseInt(sessionId)));

        // 🔥 KV 캐시 폭파! (회원가입 완료 시 불완전한 캐시 제거 → 다음 접속 때 최신 정보 캐싱)
        await deleteKVCache(platform, `user:${sessionId}`);

        throw redirect(303, '/my');
    }
};