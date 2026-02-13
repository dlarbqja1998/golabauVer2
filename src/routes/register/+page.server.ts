import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session_id');
    if (!sessionId) throw redirect(303, '/login');

    const userId = parseInt(sessionId);
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    if (user && user.isOnboarded) {
        throw redirect(303, '/my');
    }
    return { user };
};

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) throw redirect(303, '/login');

        const formData = await request.formData();
        
        // 폼 데이터 가져오기
        const college = formData.get('college') as string;
        const department = formData.get('department') as string;
        const grade = formData.get('grade') as string;
        const birthYear = formData.get('birthYear');
        const gender = formData.get('gender') as string;

        // DB 업데이트
        await db.update(users)
            .set({
                college,     // 단과대
                department,  // 학과
                grade,       // 학년
                birthYear: birthYear ? parseInt(birthYear.toString()) : null, // 출생연도(숫자)
                gender,      // 성별
                isOnboarded: true // 완료!
            })
            .where(eq(users.id, parseInt(sessionId)));

        throw redirect(303, '/my');
    }
};