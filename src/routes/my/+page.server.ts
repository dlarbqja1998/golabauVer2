import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users, golabassyuPosts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { deleteKVCache } from '$lib/server/cache';

const loginAttempts = new Map();

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session_id');
    if (!sessionId) throw redirect(303, '/login');

    const userId = parseInt(sessionId);
    const userInfo = await db.query.users.findFirst({ where: eq(users.id, userId) });

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

export const actions: Actions = {
    logout: async ({ cookies, platform }) => {
        const sessionId = cookies.get('session_id');
        if (sessionId) {
            // 🔥 KV 캐시 폭파! (로그아웃 시 캐시된 유저 데이터 제거)
            await deleteKVCache(platform, `user:${sessionId}`);
        }
        cookies.delete('session_id', { path: '/' });
        throw redirect(303, '/');
    },

    updateProfile: async ({ request, cookies, platform }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) return fail(401);

        const data = await request.formData();
        const nickname = data.get('nickname')?.toString().trim();
        const college = data.get('college')?.toString();
        const department = data.get('department')?.toString();
        const grade = data.get('grade')?.toString();
        const kakaoId = data.get('kakaoId')?.toString().trim() || null; // 🔥 추가
        const instaId = data.get('instaId')?.toString().trim() || null; // 🔥 추가

        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            return fail(400, { message: '닉네임은 2글자 이상, 10글자 이하로 입력해주세요.' });
        }

        try {
            await db.update(users)
                .set({ nickname, college, department, grade, kakaoId, instaId }) // 🔥 DB 업데이트
                .where(eq(users.id, parseInt(sessionId)));
            // 🔥 KV 캐시 폭파! (프로필 수정 시 캐시된 유저 데이터 무효화 → 다음 접속 때 최신 정보 캐싱)
            await deleteKVCache(platform, `user:${sessionId}`);
            return { success: true };
        } catch (error) {
            return fail(500, { message: '수정에 실패했습니다.' });
        }
    },

    // becomeAdmin 로직은 기존 코드와 동일하게 유지 (생략)
    becomeAdmin: async ({ request, locals, getClientAddress }) => {
        // ... (기존 코드 복붙 유지해 주세요!) ...
        const sessionUser = locals.user;
        if (!sessionUser) return fail(401, { message: '로그인이 필요합니다.' });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const ip = getClientAddress();
        const now = Date.now();
        if (!loginAttempts.has(ip)) { loginAttempts.set(ip, { currentFails: 0, totalFails: 0, lockedUntil: 0 }); }
        const attempt = loginAttempts.get(ip);
        if (attempt.totalFails >= 15) return fail(403, { message: '🚨 지속적인 접근 시도로 인해 해당 IP는 영구 차단되었습니다.' });
        if (attempt.lockedUntil > now) {
            const remainMin = Math.ceil((attempt.lockedUntil - now) / 1000 / 60);
            return fail(429, { message: `⏳ 시도 횟수 초과! ${remainMin}분 후에 다시 시도해주세요.` });
        }
        const data = await request.formData();
        const secretCode = data.get('secretCode')?.toString();
        if (secretCode !== env.ADMIN_SECRET_KEY) {
            attempt.currentFails += 1; attempt.totalFails += 1;
            if (attempt.currentFails >= 5) {
                attempt.lockedUntil = now + 15 * 60 * 1000; attempt.currentFails = 0;
                return fail(429, { message: `❌ 5회 연속 실패! 15분 동안 인증이 차단됩니다.` });
            }
            return fail(400, { message: `❌ 비밀코드가 틀렸습니다.` });
        }
        loginAttempts.delete(ip);
        try {
            await db.update(users).set({ role: 'admin' }).where(eq(users.id, sessionUser.id));
            return { success: true, message: '관리자 권한이 활성화되었습니다! 👑' };
        } catch (error) { return fail(500, { message: '권한 변경 중 오류가 발생했습니다.' }); }
    }
};