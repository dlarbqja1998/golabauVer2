import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings } from '../../db/schema';
import { like, or, sql, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// 1. URL에서 검색어('q')를 가져옵니다. (예: /search?q=돈까스)
	const query = url.searchParams.get('q')?.trim();

	// 검색어가 없으면 빈 리스트 반환
	if (!query) {
		return { query: '', restaurants: [] };
	}

	try {
		// 2. DB에서 검색 (이름이나 카테고리에 검색어가 포함된 것)
		const searchResults = await db.select({
			id: restaurants.id,
			name: restaurants.placeName,
			mainCategory: restaurants.mainCategory,
			distanceInMeters: restaurants.distanceInMeters,
			rating: restaurants.rating,
			// 리뷰 개수 가져오기
			reviewCount: sql<number>`(
				SELECT count(*) FROM ${ratings} 
				WHERE ${ratings.restaurantId} = ${restaurants.id}
			)`.mapWith(Number),
			keywordReviewCount: sql<number>`(
				SELECT count(*) FROM ${keywordReviews} 
				WHERE ${keywordReviews.restaurantId} = ${restaurants.id}
			)`.mapWith(Number),
		})
		.from(restaurants)
		.where(
			or(
				like(restaurants.placeName, `%${query}%`), // 식당 이름에 포함되거나
				like(restaurants.mainCategory, `%${query}%`) // 카테고리(한식, 중식 등)에 포함된 경우
			)
		)
		.limit(30); // 너무 많이 나오면 곤란하니 30개만

		return {
			query,
			restaurants: searchResults
		};
	} catch (error) {
		console.error('검색 에러:', error);
		return { query, restaurants: [] };
	}
};