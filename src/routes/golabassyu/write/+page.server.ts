import { db } from '$lib/server/db';
// 👇 경로를 직접 지정해서 확실하게 가져옵니다!
import { golabassyuPosts, ratings } from '../../../db/schema'; 
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const actions = {
    createPost: async ({ request }: RequestEvent) => {
        const data = await request.formData();
        
        // 폼 데이터 가져오기
        const area = data.get('area')?.toString() || '전체';
        const restaurantName = data.get('restaurantName')?.toString() || '';
        const restaurantId = Number(data.get('restaurantId')); 
        const rating = Number(data.get('rating')) || 0;        
        const title = data.get('title')?.toString() || '';
        const content = data.get('content')?.toString() || '';
        const imageUrl = data.get('imageUrl')?.toString() || null;

        // 1. 게시글 저장 (글쓰기)
        await db.insert(golabassyuPosts).values({
            userId: 1, // 임시: 1호 유저
            restaurantName,
            rating, // 이제 빨간 줄 안 뜰 겁니다!
            title,
            content,
            imageUrl,
            area,
            likes: 0
        });

        // 2. 식당 평점 연동 (ratings 테이블)
        if (restaurantId && rating > 0) {
            try {
                // 이미 import { ratings } 해왔으므로 사용 가능
                await db.insert(ratings).values({
                    restaurantId: restaurantId,
                    rating: rating,
                });
                console.log(`[System] ${restaurantName} 식당에 ${rating}점 반영 완료!`);
            } catch (e) {
                console.error("평점 반영 중 오류 (이미 평가했을 수 있음):", e);
            }
        }

        throw redirect(303, '/golabassyu');
    }
};