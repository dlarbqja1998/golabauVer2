// src/routes/list/[category]/+page.server.ts
import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings } from '../../../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm'; 
import type { PageServerLoad } from './$types';

// 🔥 [수정됨] 매개변수에 setHeaders를 추가로 받아옵니다.
export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
    
    // 🔥 [핵심 방어막] Cloudflare Edge 서버에 5초간 캐시, 만료 후 10초 동안은 백그라운드에서 갱신
    setHeaders({
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600'
    });

    const category = params.category;
    const page = Number(url.searchParams.get('page')) || 1;
    const sort = url.searchParams.get('sort') || 'rating';
    const currentZone = url.searchParams.get('zone') || '전체'; 
    const limit = 15;
    const offset = (page - 1) * limit;

    try {
        const whereConditions = [eq(restaurants.mainCategory, category)];
        if (currentZone !== '전체') {
            whereConditions.push(eq(restaurants.zone, currentZone));
        }

        const totalCountRes = await db
            .select({ count: sql<number>`count(*)` })
            .from(restaurants)
            .where(and(...whereConditions));
        
        const totalCount = Number(totalCountRes[0]?.count || 0);
        const totalPages = Math.ceil(totalCount / limit);

        // 정렬 로직 (기존과 동일)
        let orderByClause;
        if (sort === 'rating') {
            orderByClause = [desc(restaurants.rating)];
        } else if (sort === 'review') {
            orderByClause = [desc(sql`(SELECT count(*) FROM golabassyu_posts WHERE restaurant_id = restaurants.id)`)];
        } else {
            orderByClause = [sql`${restaurants.distanceInMeters} ASC NULLS LAST`];
        }

        const restaurantList = await db.select({
            id: restaurants.id,
            name: restaurants.placeName,
            distanceInMeters: restaurants.distanceInMeters,
            walkTimeInMinutes: restaurants.walkTimeInMinutes,
            rating: restaurants.rating,
            zone: restaurants.zone, 
            keywordReviewCount: sql<number>`(SELECT count(*) FROM keyword_reviews WHERE restaurant_id = restaurants.id)`.mapWith(Number),
            postCount: sql<number>`(SELECT count(*) FROM golabassyu_posts WHERE restaurant_id = restaurants.id)`.mapWith(Number),
        })
        .from(restaurants)
        .where(and(...whereConditions)) 
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
            currentZone, 
            pagination: { page, totalPages, totalCount }
        };
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        return { category, restaurants: [], sort: 'rating', currentZone: '전체', pagination: { page: 1, totalPages: 1, totalCount: 0 } };
    }
};