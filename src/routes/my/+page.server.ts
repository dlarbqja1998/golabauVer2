// src/routes/my/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users, golabassyuPosts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

// 🔥 [보안] 메모리에 IP별 관리자 로그인 실패 기록 저장
const loginAttempts = new Map();

// 1. 데이터 불러오기
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

// 2. 액션
export const actions: Actions = {
    logout: async ({ cookies }) => {
        cookies.delete('session_id', { path: '/' });
        throw redirect(303, '/');
    },

    updateProfile: async ({ request, cookies }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) return fail(401);

        const data = await request.formData();
        
        const nickname = data.get('nickname')?.toString().trim();
        const college = data.get('college')?.toString();      // 단과대
        const department = data.get('department')?.toString(); // 학과
        const grade = data.get('grade')?.toString();

        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            console.log(`[보안] 마이페이지 닉네임 길이 조작 시도: ${nickname?.length || 0}자`);
            return fail(400, { message: '닉네임은 2글자 이상, 10글자 이하로 입력해주세요.' });
        }

        try {
            await db.update(users)
                .set({
                    nickname,
                    college,    
                    department,
                    grade
                })
                .where(eq(users.id, parseInt(sessionId)));

            return { success: true };

        } catch (error) {
            console.error('프로필 수정 에러:', error);
            return fail(500, { message: '수정에 실패했습니다.' });
        }
    },

    // 🔥 브루트포스 방어 로직이 완벽하게 적용된 관리자 권한 획득 액션
    becomeAdmin: async ({ request, locals, getClientAddress }) => {
        const sessionUser = locals.user;
        if (!sessionUser) return fail(401, { message: '로그인이 필요합니다.' });

        // 🛡️ 1. 무조건 1초 지연 (매크로/브루트포싱 속도 저하)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const ip = getClientAddress();
        const now = Date.now();
        
        // IP 기록 가져오기 (처음이면 초기화)
        if (!loginAttempts.has(ip)) {
            loginAttempts.set(ip, { currentFails: 0, totalFails: 0, lockedUntil: 0 });
        }
        const attempt = loginAttempts.get(ip);

        // 🛡️ 2. 총 15회 이상 틀렸는지 체크 (영구 차단)
        if (attempt.totalFails >= 15) {
            return fail(403, { message: '🚨 지속적인 접근 시도로 인해 해당 IP는 영구 차단되었습니다.' });
        }

        // 🛡️ 3. 5회 연속 실패로 인한 15분 쿨타임 체크
        if (attempt.lockedUntil > now) {
            const remainMin = Math.ceil((attempt.lockedUntil - now) / 1000 / 60);
            return fail(429, { message: `⏳ 시도 횟수 초과! ${remainMin}분 후에 다시 시도해주세요.` });
        }

        const data = await request.formData();
        const secretCode = data.get('secretCode')?.toString();

        // 🛡️ 4. 비밀번호 검증 (.env 파일에 ADMIN_SECRET_KEY 확인)
        if (secretCode !== env.ADMIN_SECRET_KEY) {
            attempt.currentFails += 1;
            attempt.totalFails += 1;

            // 방금 틀려서 연속 5회가 된 경우 -> 15분 락 걸기
            if (attempt.currentFails >= 5) {
                attempt.lockedUntil = now + 15 * 60 * 1000; // 15분 후
                attempt.currentFails = 0; // 쿨타임 걸렸으니 연속 카운트는 초기화 (누적 횟수는 유지)
                return fail(429, { 
                    message: `❌ 5회 연속 실패! 15분 동안 인증이 차단됩니다. (총 ${attempt.totalFails}회/15회 실패)` 
                });
            }

            // 일반적인 오답 (누적 15회가 되면 다음 시도부터 403 영구차단)
            return fail(400, { 
                message: `❌ 비밀코드가 틀렸습니다. (${attempt.totalFails}회/15회 실패 시 영구 차단됩니다)` 
            });
        }

        // 🛡️ 5. 인증 성공! (IP 기록 깔끔하게 지워줌)
        loginAttempts.delete(ip);

        try {
            await db.update(users)
                .set({ role: 'admin' })
                .where(eq(users.id, sessionUser.id));

            return { success: true, message: '관리자 권한이 활성화되었습니다! 👑' };
        } catch (error) {
            return fail(500, { message: '권한 변경 중 오류가 발생했습니다.' });
        }
    }
};