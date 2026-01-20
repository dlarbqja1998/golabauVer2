import { db } from '$lib/server/db';
import { golabassyuPosts } from '$lib/server/schema';
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit'; // ★ 1. 타입 가져오기

export const actions = {
    // ★ 2. 명찰 달아주기 (: RequestEvent)
    createPost: async ({ request }: RequestEvent) => {
        const data = await request.formData();
        
        // 폼에서 데이터 가져오기
        const area = data.get('area')?.toString() || '전체';
        const restaurant = data.get('restaurant')?.toString() || '';
        const title = data.get('title')?.toString() || '';
        const content = data.get('content')?.toString() || '';
        const imageUrl = data.get('imageUrl')?.toString() || null;

        // DB에 저장 (userId: 1은 아까 만든 '개발자' 계정)
        await db.insert(golabassyuPosts).values({
            userId: 1, // 1호 유저(개발자)로 강제 저장
            restaurant,
            title,
            content,
            imageUrl,
            area,
            likes: 0
        });

        // 저장 성공하면 리스트 페이지로 튕기기
        throw redirect(303, '/golabassyu');
    }
};