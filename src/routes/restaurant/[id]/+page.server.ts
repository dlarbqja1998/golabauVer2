import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings } from '../../../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// 데이터 불러오기 (Load)
export const load: PageServerLoad = async ({ params, locals }) => {
    const restaurantId = Number(params.id);
    const user = locals.user; // 현재 로그인한 유저 정보

    try {
        const restaurantData = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
        
        if (!restaurantData || restaurantData.length === 0) {
            return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [] };
        }

        // 1. 전체 상위 5개 키워드 통계
        const topKeywords = await db
            .select({ keyword: keywordReviews.keyword, count: sql<number>`count(*)` })
            .from(keywordReviews)
            .where(eq(keywordReviews.restaurantId, restaurantId))
            .groupBy(keywordReviews.keyword)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        // 2. [추가] 로그인 했다면 '내가 남긴 데이터' 가져오기
        let myRating = null;
        let myKeywords: string[] = [];

        if (user) {
            // (1) 내 별점
            const ratingData = await db.select()
                .from(ratings)
                .where(and(eq(ratings.restaurantId, restaurantId), eq(ratings.userId, user.id)))
                .limit(1);
            if (ratingData.length > 0) myRating = ratingData[0].rating;

            // (2) 내 키워드
            const keywordData = await db.select()
                .from(keywordReviews)
                .where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, user.id)));
            myKeywords = keywordData.map(r => r.keyword);
        }

        return { 
            restaurant: restaurantData[0], 
            topKeywords, 
            myRating, // 내 별점 (없으면 null)
            myKeywords, // 내 키워드 배열 (없으면 [])
			user: locals.user
        };

    } catch (error) {
        console.error('식당 정보 로드 에러:', error);
        return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], user: null };
    }
};

// 리뷰 저장하기 (Actions)
export const actions: Actions = {
    // 별점 저장 (수정 가능하게 변경)
    submitRating: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const rating = Number(data.get('rating'));
        const restaurantId = Number(params.id);
        const userId = locals.user.id;

        if (!rating || rating < 1 || rating > 5) return fail(400);

        try {
            // 1. 이미 별점을 남겼는지 확인
            const existingRating = await db.select().from(ratings)
                .where(and(eq(ratings.restaurantId, restaurantId), eq(ratings.userId, userId)))
                .limit(1);

            if (existingRating.length > 0) {
                // [수정] 이미 있으면 업데이트
                await db.update(ratings)
                    .set({ rating })
                    .where(eq(ratings.id, existingRating[0].id));
            } else {
                // [신규] 없으면 생성
                await db.insert(ratings).values({ restaurantId, userId, rating });
            }

            // 2. 식당 평균 별점 재계산 (동일)
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

    // 키워드 리뷰 저장 (덮어쓰기 로직)
    submitKeyword: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const keywords = data.getAll('keywords') as string[];
        const restaurantId = Number(params.id);
        const userId = locals.user.id;

        // 키워드 선택 안 하고 제출하면 -> 내 리뷰 삭제로 간주할 수도 있고, 에러로 볼 수도 있음.
        // 여기서는 빈 값도 허용(삭제)하거나 최소 1개 강제할 수 있음. 일단 1개 이상 권장.
        
        try {
            // 1. 기존 내 키워드 리뷰 싹 지우기 (초기화)
            await db.delete(keywordReviews)
                .where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, userId)));

            // 2. 새로 선택한 것들 저장
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