import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings, golabassyuPosts } from '../../../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const restaurantId = Number(params.id);
    const user = locals.user;

    try {
        const restaurantData = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
        
        if (!restaurantData || restaurantData.length === 0) {
            return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], reviews: [] };
        }

        // 1. 전체 상위 5개 키워드 통계
        const topKeywords = await db
            .select({ keyword: keywordReviews.keyword, count: sql<number>`count(*)` })
            .from(keywordReviews)
            .where(eq(keywordReviews.restaurantId, restaurantId))
            .groupBy(keywordReviews.keyword)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        // 2. 내 별점 및 키워드 데이터
        let myRating = null;
        let myKeywords: string[] = [];

        if (user) {
            const ratingData = await db.select()
                .from(ratings)
                .where(and(eq(ratings.restaurantId, restaurantId), eq(ratings.userId, user.id)))
                .limit(1);
            if (ratingData.length > 0) myRating = ratingData[0].rating;

            const keywordData = await db.select()
                .from(keywordReviews)
                .where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, user.id)));
            myKeywords = keywordData.map(r => r.keyword);
        }

        // 🔥 3. [추가] 이 식당에 작성된 골라바쓔 리뷰(포스트) 목록 가져오기!
        const reviews = await db.select()
            .from(golabassyuPosts)
            .where(eq(golabassyuPosts.restaurantId, restaurantId))
            .orderBy(desc(golabassyuPosts.createdAt));

        return { 
            restaurant: restaurantData[0], 
            topKeywords, 
            myRating, 
            myKeywords, 
            reviews, // 🔥 뷰로 넘겨줌
            user: locals.user
        };

    } catch (error) {
        console.error('식당 정보 로드 에러:', error);
        return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], reviews: [], user: null };
    }
};

// ... (아래 액션 부분인 submitRating, submitKeyword는 기존과 100% 동일하게 유지하시면 됩니다!)
export const actions: Actions = {
    submitRating: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const rating = Number(data.get('rating'));
        const restaurantId = Number(params.id);
        const userId = locals.user.id;

        if (!rating || rating < 1 || rating > 5) return fail(400, {message: '별점은 1점 이상 주셔야 합니다.'});

        try {
            const existingRating = await db.select().from(ratings)
                .where(and(eq(ratings.restaurantId, restaurantId), eq(ratings.userId, userId)))
                .limit(1);

            if (existingRating.length > 0) {
                await db.update(ratings)
                    .set({ rating })
                    .where(eq(ratings.id, existingRating[0].id));
            } else {
                await db.insert(ratings).values({ restaurantId, userId, rating });
            }

            const avgResult = await db.select({ avg: sql<number>`avg(${ratings.rating})` })
                .from(ratings).where(eq(ratings.restaurantId, restaurantId));
            const newAvg = Number(avgResult[0]?.avg || 0);
            
            await db.update(restaurants).set({ rating: newAvg }).where(eq(restaurants.id, restaurantId));

            return { success: true };
        } catch (error) {
            console.error('별점 저장 에러:', error);
            return fail(500);
        }
    },

    submitKeyword: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const keywords = data.getAll('keywords') as string[];
        const restaurantId = Number(params.id);
        const userId = locals.user.id;

        try {
            await db.delete(keywordReviews)
                .where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, userId)));

            if (keywords && keywords.length > 0) {
                for (const k of keywords) {
                    await db.insert(keywordReviews).values({ restaurantId, userId, keyword: k });
                }
            }
            return { success: true };
        } catch (error) {
            console.error('키워드 저장 에러:', error);
            return fail(500);
        }
    }
};