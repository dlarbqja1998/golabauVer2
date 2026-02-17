import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users, golabassyuPosts } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

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

// 2. 액션 (수정 로직 업데이트)
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
        if (!nickname || nickname.length < 2) {
            return fail(400, { message: '닉네임은 2글자 이상이어야 합니다.' });
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
    }
};