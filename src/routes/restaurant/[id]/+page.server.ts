// src/routes/restaurant/[id]/+page.server.ts
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
            return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], reviews: [], user: null };
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

        // 3. 이 식당에 작성된 리뷰(포스트) 목록 가져오기
        const fetchedReviews = await db.select()
            .from(golabassyuPosts)
            .where(eq(golabassyuPosts.restaurantId, restaurantId))
            .orderBy(desc(golabassyuPosts.createdAt));

        // 🔥 [원상복구] 식당 정보는 개인정보가 아니므로 프론트에서 필요한 데이터를 다 넘깁니다. (x, y, 카테고리 등)
        const safeRestaurant = restaurantData[0];

        // 🔥 [보안 패치 + 프론트 호환] 리뷰 작성자의 userId는 차단하고, 프론트 썸네일용 imageUrl은 살립니다!
        const reviews = fetchedReviews.map(rev => ({
            id: rev.id,
            title: rev.title,
            content: rev.content,
            rating: rev.rating,
            createdAt: rev.createdAt,
            imageUrl: rev.imageUrl // 프론트의 getFirstImage 함수를 위해 반드시 필요!
            // 🚨 userId는 넘기지 않음!
        }));

        // 🔥 [보안 패치] 현재 유저 정보 최소화
        const safeUser = user ? { id: user.id, role: user.role } : null;

        return { 
            restaurant: safeRestaurant, 
            topKeywords, 
            myRating, 
            myKeywords, 
            reviews,
            user: safeUser
        };

    } catch (error) {
        console.error('식당 정보 로드 에러:', error);
        return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], reviews: [], user: null };
    }
};

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