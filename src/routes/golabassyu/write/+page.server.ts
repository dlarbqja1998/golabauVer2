import { db } from '$lib/server/db';
import { golabassyuPosts, ratings, restaurants, users, pointLogs } from '../../../db/schema'; 
import { eq, sql } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { containsBadWord } from '$lib/server/badwords';

// 🔥 캐시 삭제 함수 가져오기
import { deleteKVCache } from '$lib/server/cache';

export const actions = {
    // 🔥 RequestEvent에서 platform을 뽑아옵니다.
    createPost: async ({ request, locals, platform }: RequestEvent) => {
        if (!locals.user) {
            throw redirect(303, '/login');
        }

        const data = await request.formData();
        
        const restaurantId = Number(data.get('restaurantId')); 
        const rating = Number(data.get('rating')) || 0;        
        const content = data.get('content')?.toString() || '';
        const imageUrl = data.get('imageUrl')?.toString() || null;
        const returnTo = data.get('returnTo')?.toString();

        if (rating < 1 || rating > 5) {
            return fail(400, { message: '별점은 1점 이상 주셔야 합니다.' });
        }

        if (!restaurantId || restaurantId <= 0) {
            return fail(400, { message: '유효하지 않은 식당입니다.' });
        }

        const targetRestaurant = await db.query.restaurants.findFirst({
            where: eq(restaurants.id, restaurantId)
        });

        if (!targetRestaurant) {
            return fail(400, { message: '존재하지 않는 식당입니다. 비정상적인 접근입니다.' });
        }

        const realRestaurantName = targetRestaurant.placeName;
        const autoArea = targetRestaurant.zone || '기타';
        const title = realRestaurantName + " 후기";

        if (containsBadWord(title) || containsBadWord(content)) {
            return fail(400, { message: '욕설이나 비속어는 등록할 수 없습니다.' });
        }

        const isPhotoAttached = !!imageUrl && imageUrl.trim().length > 0;
        const pointReward = isPhotoAttached ? 10 : 7;
        const userId = locals.user.id; // TS Lint 해결용 변수 캡처

        try {
            // 트랜잭션(tx) 없이 순차적 비동기 처리
            await db.insert(golabassyuPosts).values({
                userId: userId, 
                restaurantName: realRestaurantName,
                restaurantId: restaurantId,
                rating: rating,
                title: title,
                content: content,
                imageUrl: imageUrl,
                area: autoArea, 
                likes: 0
            });

            try {
                await db.insert(ratings).values({
                    restaurantId: restaurantId,
                    rating: rating,
                    userId: userId, 
                });
            } catch (e) {
                console.error("평점 반영 실패:", e);
            }

            // 포인트 지급 로직
            await db.update(users)
                .set({ points: sql`${users.points} + ${pointReward}` })
                .where(eq(users.id, userId));
            
            await db.insert(pointLogs).values({
                userId: userId,
                amount: pointReward,
                reason: isPhotoAttached ? '사진 첨부 리뷰 작성' : '일반 리뷰 작성'
            });
        } catch (err) {
            console.error('글쓰기 에러:', err);
            return fail(500, { message: '글 저장에 실패했습니다.' });
        }

        // 🔥 [캐시 폭파] 새 글이 작성되었으므로 피드 전체 캐시 및 식당 캐시 동시 폭파!
        await deleteKVCache(platform, 'golabassyu_all_posts');
        await deleteKVCache(platform, `restaurant_detail_${restaurantId}`);

        if (returnTo) {
            throw redirect(303, returnTo);
        }
        throw redirect(303, '/golabassyu');
    }
};