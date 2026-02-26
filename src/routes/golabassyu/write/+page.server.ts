import { db } from '$lib/server/db';
// 🔥 restaurants 테이블과 eq 연산자 import 추가!
import { golabassyuPosts, ratings, restaurants } from '../../../db/schema'; 
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const actions = {
    createPost: async ({ request, locals }: RequestEvent) => {
        if (!locals.user) {
            throw redirect(303, '/login');
        }

        const data = await request.formData();
        
        const restaurantName = data.get('restaurantName')?.toString() || '';
        const restaurantId = Number(data.get('restaurantId')); 
        const rating = Number(data.get('rating')) || 0;        
        const title = data.get('title')?.toString() || '';
        const content = data.get('content')?.toString() || '';
        const imageUrl = data.get('imageUrl')?.toString() || null;

        // 🔥 [핵심 로직] 사용자에게 묻지 않고, 식당 ID를 이용해 DB에서 진짜 구역을 알아냅니다!
        let autoArea = '기타';
        if (restaurantId && restaurantId > 0) {
            const targetRestaurant = await db.query.restaurants.findFirst({
                where: eq(restaurants.id, restaurantId)
            });
            // 식당 정보가 있고 zone 값이 있다면 그걸 사용
            if (targetRestaurant && targetRestaurant.zone) {
                autoArea = targetRestaurant.zone;
            }
        }

        try {
            await db.insert(golabassyuPosts).values({
                userId: locals.user.id, 
                restaurantName: restaurantName,
                restaurantId: restaurantId,
                rating: rating,
                title: title,
                content: content,
                imageUrl: imageUrl,
                area: autoArea, // 🔥 DB에서 찾아낸 정확한 구역 정보가 알아서 들어감!
                likes: 0
            });

            if (restaurantId && restaurantId > 0 && rating > 0) {
                try {
                    await db.insert(ratings).values({
                        restaurantId: restaurantId,
                        rating: rating,
                        userId: locals.user.id, 
                    });
                } catch (e) {
                    console.error("평점 반영 실패 (식당 ID 불일치 등):", e);
                }
            }

        } catch (err) {
            console.error('글쓰기 에러:', err);
            return fail(500, { message: '글 저장에 실패했습니다.' });
        }

        throw redirect(303, '/golabassyu');
    }
};