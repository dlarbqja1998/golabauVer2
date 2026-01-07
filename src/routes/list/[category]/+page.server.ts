import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings } from '../../../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const category = params.category;
	const page = Number(url.searchParams.get('page')) || 1; // 현재 페이지 (기본 1)
	const limit = 15; // 페이지당 15개
	const offset = (page - 1) * limit;

	try {
		// 1. 전체 개수 가져오기 (페이지네이션 계산용)
		const totalCountRes = await db
			.select({ count: sql<number>`count(*)` })
			.from(restaurants)
			.where(eq(restaurants.mainCategory, category));
		const totalCount = Number(totalCountRes[0]?.count || 0);
		const totalPages = Math.ceil(totalCount / limit);

		// 2. 식당 리스트 가져오기
		const restaurantList = await db.select({
			id: restaurants.id,
			name: restaurants.placeName,
			distanceInMeters: restaurants.distanceInMeters,
			rating: restaurants.rating,
			// 키워드 리뷰 총 개수
			keywordReviewCount: sql<number>`(
				SELECT count(*) FROM ${keywordReviews} 
				WHERE ${keywordReviews.restaurantId} = ${restaurants.id}
			)`.mapWith(Number),
			// 별점 참여 개수 (새로 추가됨: '리뷰 000개'에 사용)
			ratingCount: sql<number>`(
				SELECT count(*) FROM ${ratings} 
				WHERE ${ratings.restaurantId} = ${restaurants.id}
			)`.mapWith(Number),
		})
		.from(restaurants)
		.where(eq(restaurants.mainCategory, category))
		.limit(limit)
		.offset(offset);

		// 3. 각 식당별 상위 3개 키워드 가져오기 (N+1 쿼리지만 15개라 빠름)
		const listWithKeywords = await Promise.all(restaurantList.map(async (r) => {
			const topKeywords = await db
				.select({ keyword: keywordReviews.keyword, count: sql<number>`count(*)` })
				.from(keywordReviews)
				.where(eq(keywordReviews.restaurantId, r.id))
				.groupBy(keywordReviews.keyword)
				.orderBy(desc(sql`count(*)`))
				.limit(3);
			
			return { ...r, topKeywords };
		}));

		return {
			category,
			restaurants: listWithKeywords,
			pagination: {
				page,
				totalPages,
				totalCount
			}
		};
	} catch (error) {
		console.error('데이터 로드 실패:', error);
		return { category, restaurants: [], pagination: { page: 1, totalPages: 1, totalCount: 0 } };
	}
};