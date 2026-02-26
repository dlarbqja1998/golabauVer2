import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings } from '../../../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm'; // 🔥 and 추가!
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
    const category = params.category;
    const page = Number(url.searchParams.get('page')) || 1;
    const sort = url.searchParams.get('sort') || 'rating';
    const currentZone = url.searchParams.get('zone') || '전체'; // 🔥 선택된 구역 받기 (기본값: 전체)
    const limit = 15;
    const offset = (page - 1) * limit;

    try {
        // 🔥 1. 카테고리와 구역 필터를 동시에 거는 로직
        const whereConditions = [eq(restaurants.mainCategory, category)];
        if (currentZone !== '전체') {
            whereConditions.push(eq(restaurants.zone, currentZone));
        }

        // 전체 개수 가져오기 (필터링된 상태로 계산해야 페이지네이션이 안 깨짐!)
        const totalCountRes = await db
            .select({ count: sql<number>`count(*)` })
            .from(restaurants)
            .where(and(...whereConditions));
        
        const totalCount = Number(totalCountRes[0]?.count || 0);
        const totalPages = Math.ceil(totalCount / limit);

        // 정렬 조건
        let orderByClause;
        if (sort === 'rating') {
            orderByClause = [desc(restaurants.rating)];
        } else if (sort === 'review') {
            orderByClause = [desc(sql`(SELECT count(*) FROM ratings WHERE restaurant_id = restaurants.id)`)];
        } else {
            orderByClause = [sql`${restaurants.distanceInMeters} ASC NULLS LAST`];
        }

        // 🔥 2. 필터 + 정렬이 모두 적용된 식당 리스트 가져오기
        const restaurantList = await db.select({
            id: restaurants.id,
            name: restaurants.placeName,
            distanceInMeters: restaurants.distanceInMeters,
            walkTimeInMinutes: restaurants.walkTimeInMinutes,
            rating: restaurants.rating,
            zone: restaurants.zone, // 🔥 프론트에서 보여주기 위해 존 정보 추가
            keywordReviewCount: sql<number>`(SELECT count(*) FROM keyword_reviews WHERE restaurant_id = restaurants.id)`.mapWith(Number),
            ratingCount: sql<number>`(SELECT count(*) FROM ratings WHERE restaurant_id = restaurants.id)`.mapWith(Number),
        })
        .from(restaurants)
        .where(and(...whereConditions)) // 카테고리 + 구역
        .orderBy(...orderByClause)
        .limit(limit)
        .offset(offset);

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
            sort,
            currentZone, // 프론트로 현재 선택된 구역 전달
            pagination: { page, totalPages, totalCount }
        };
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        return { category, restaurants: [], sort: 'rating', currentZone: '전체', pagination: { page: 1, totalPages: 1, totalCount: 0 } };
    }
};