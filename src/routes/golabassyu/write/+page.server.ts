import { db } from '$lib/server/db';
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
        
        // 🔥 어디로 돌아가야 하는지 파라미터 확인
        const returnTo = data.get('returnTo')?.toString();

        let autoArea = '기타';
        if (restaurantId && restaurantId > 0) {
            const targetRestaurant = await db.query.restaurants.findFirst({
                where: eq(restaurants.id, restaurantId)
            });
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
                area: autoArea, 
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
                    console.error("평점 반영 실패:", e);
                }
            }

        } catch (err) {
            console.error('글쓰기 에러:', err);
            return fail(500, { message: '글 저장에 실패했습니다.' });
        }

        // 🔥 상세페이지에서 왔다면 그곳으로 돌려보내기! 아니면 골라바쓔로!
        if (returnTo) {
            throw redirect(303, returnTo);
        }
        throw redirect(303, '/golabassyu');
    }
};