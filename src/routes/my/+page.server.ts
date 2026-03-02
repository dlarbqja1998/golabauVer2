import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users, golabassyuPosts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
// 🔥 수정됨: dynamic 대신 static으로 불러와야 오류가 안 납니다!
import { env } from '$env/dynamic/private';

// 1. 데이터 불러오기 (기존 동일)
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

// 2. 액션 (🔥 하나의 actions 객체 안에 모두 넣어야 합니다!)
export const actions: Actions = {
    logout: async ({ cookies }) => {
        cookies.delete('session_id', { path: '/' });
        throw redirect(303, '/');
    },

    updateProfile: async ({ request, cookies }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) return fail(401);

        const data = await request.formData();
        
        // 폼 데이터 가져오기
        const nickname = data.get('nickname')?.toString().trim();
        const college = data.get('college')?.toString();      // [추가] 단과대
        const department = data.get('department')?.toString(); // 학과
        const grade = data.get('grade')?.toString();

        // 유효성 검사
        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            console.log(`[보안] 마이페이지 닉네임 길이 조작 시도: ${nickname?.length || 0}자`);
            return fail(400, { message: '닉네임은 2글자 이상, 10글자 이하로 입력해주세요.' });
        }

        try {
            // DB 업데이트 (단과대 포함)
            await db.update(users)
                .set({
                    nickname,
                    college,    // [추가] 단과대도 같이 수정됨!
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

    // 🔥 기존 actions 안에 becomeAdmin을 추가했습니다! (request, locals 타입 에러도 해결됨)
    becomeAdmin: async ({ request, locals }) => {
        const sessionUser = locals.user;
        if (!sessionUser) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const secretCode = data.get('secretCode')?.toString();

        // 1. 비밀번호 일치 확인
        if (secretCode !== env.ADMIN_SECRET_KEY) {
            return fail(400, { message: '비밀코드가 틀렸습니다.' });
        }

        // 2. 일치하면 DB에서 해당 유저의 role을 'admin'으로 변경
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