import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings } from '../../../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

// 데이터 불러오기 (Load)
export const load: PageServerLoad = async ({ params }) => {
	const restaurantId = Number(params.id);

	try {
		const restaurantData = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
		
		// [요청 3] 상위 5개 키워드 가져오기
		const topKeywords = await db
			.select({ keyword: keywordReviews.keyword, count: sql<number>`count(*)` })
			.from(keywordReviews)
			.where(eq(keywordReviews.restaurantId, restaurantId))
			.groupBy(keywordReviews.keyword)
			.orderBy(desc(sql`count(*)`))
			.limit(5);

		return { restaurant: restaurantData[0], topKeywords };
	} catch (error) {
		return { restaurant: null, topKeywords: [] };
	}
};

// 리뷰 저장하기 (Actions)
export const actions: Actions = {
	// 별점 저장
	submitRating: async ({ request, params }) => {
		const data = await request.formData();
		const rating = Number(data.get('rating'));
		const restaurantId = Number(params.id);

		if (!rating || rating < 1 || rating > 5) return { success: false };

		// 1. ratings 테이블에 추가
		await db.insert(ratings).values({ restaurantId, rating });

		// 2. 평균 다시 계산해서 restaurants 테이블 업데이트 (즉시 반영)
		const avgResult = await db.select({ avg: sql`avg(${ratings.rating})` }).from(ratings).where(eq(ratings.restaurantId, restaurantId));
		const newAvg = Number(avgResult[0]?.avg || 0);
		await db.update(restaurants).set({ rating: newAvg }).where(eq(restaurants.id, restaurantId));

		return { success: true };
	},

	// 키워드 리뷰 저장
	submitKeyword: async ({ request, params }) => {
		const data = await request.formData();
		const keywords = data.getAll('keywords') as string[]; // 여러 개 선택 가능
		const restaurantId = Number(params.id);

		if (!keywords || keywords.length === 0) return { success: false };

		// 선택한 키워드들을 DB에 저장
		for (const k of keywords) {
			await db.insert(keywordReviews).values({ restaurantId, keyword: k });
		}

		return { success: true };
	}
};