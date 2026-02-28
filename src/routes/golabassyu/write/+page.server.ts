import { db } from '$lib/server/db';
import { golabassyuPosts, ratings, restaurants } from '../../../db/schema'; 
import { eq } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { containsBadWord } from '$lib/server/badwords';

export const actions = {
    createPost: async ({ request, locals }: RequestEvent) => {
        if (!locals.user) {
            throw redirect(303, '/login');
        }

        const data = await request.formData();
        
        const restaurantId = Number(data.get('restaurantId')); 
        const rating = Number(data.get('rating')) || 0;        
        const content = data.get('content')?.toString() || '';
        const imageUrl = data.get('imageUrl')?.toString() || null;
        const returnTo = data.get('returnTo')?.toString();

        
        // 🔥 [이슈 4] 별점이 1점 미만이면 서버에서도 컷!
        if (rating < 1 || rating > 5) {
            return fail(400, { message: '별점은 1점 이상 주셔야 합니다.' });
        }

        // 🔥 [이슈 3: 폼 변조 방지] 유저가 보낸 이름은 싹 무시! 무조건 ID로 DB에서 직접 찾기!
        if (!restaurantId || restaurantId <= 0) {
            return fail(400, { message: '유효하지 않은 식당입니다.' });
        }

        const targetRestaurant = await db.query.restaurants.findFirst({
            where: eq(restaurants.id, restaurantId)
        });

        if (!targetRestaurant) {
            return fail(400, { message: '존재하지 않는 식당입니다. 비정상적인 접근입니다.' });
        }

        // DB에 있는 진짜 데이터를 강제로 사용 (변조 방지 100%)
        const realRestaurantName = targetRestaurant.placeName;
        const autoArea = targetRestaurant.zone || '기타';
        const title = realRestaurantName + " 후기";

        if (containsBadWord(title) || containsBadWord(content)) {
            return fail(400, { message: '욕설이나 비속어는 등록할 수 없습니다.' });
        }

        try {
            await db.insert(golabassyuPosts).values({
                userId: locals.user.id, 
                restaurantName: realRestaurantName, // 유저 폼데이터 대신 DB 이름 삽입
                restaurantId: restaurantId,
                rating: rating,
                title: title,
                content: content,
                imageUrl: imageUrl,
                area: autoArea, 
                likes: 0
            });

            // 식당 별점(ratings) 업데이트
            try {
                await db.insert(ratings).values({
                    restaurantId: restaurantId,
                    rating: rating,
                    userId: locals.user.id, 
                });
            } catch (e) {
                console.error("평점 반영 실패:", e);
            }

        } catch (err) {
            console.error('글쓰기 에러:', err);
            return fail(500, { message: '글 저장에 실패했습니다.' });
        }

        if (returnTo) {
            throw redirect(303, returnTo);
        }
        throw redirect(303, '/golabassyu');
    }
};