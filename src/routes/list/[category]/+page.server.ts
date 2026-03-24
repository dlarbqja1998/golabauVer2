import { db } from '$lib/server/db';
import { restaurants } from '../../../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
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

        let orderByClause;
        if (sort === 'rating') {
            orderByClause = [desc(restaurants.rating)];
        } else if (sort === 'review') {
            orderByClause = [desc(sql`(SELECT count(*) FROM golabassyu_posts WHERE restaurant_id = restaurants.id)`)];
        } else {
            orderByClause = [sql`${restaurants.distanceInMeters} ASC NULLS LAST`];
        }

        const restaurantList = await db
            .select({
                id: restaurants.id,
                name: restaurants.placeName,
                distanceInMeters: restaurants.distanceInMeters,
                walkTimeInMinutes: restaurants.walkTimeInMinutes,
                rating: restaurants.rating,
                zone: restaurants.zone,
                keywordReviewCount: sql<number>`(SELECT count(*) FROM keyword_reviews WHERE restaurant_id = restaurants.id)`.mapWith(Number),
                postCount: sql<number>`(SELECT count(*) FROM golabassyu_posts WHERE restaurant_id = restaurants.id)`.mapWith(Number)
            })
            .from(restaurants)
            .where(and(...whereConditions))
            .orderBy(...orderByClause)
            .limit(limit)
            .offset(offset);

        const restaurantIds = restaurantList.map((restaurant) => restaurant.id);
        const topKeywordMap = new Map<number, { keyword: string; count: number }[]>();

        if (restaurantIds.length > 0) {
            const keywordRows = await db.execute(sql`
                WITH ranked_keywords AS (
                    SELECT
                        restaurant_id,
                        keyword,
                        count(*)::int AS count,
                        ROW_NUMBER() OVER (
                            PARTITION BY restaurant_id
                            ORDER BY count(*) DESC, keyword ASC
                        ) AS rank
                    FROM keyword_reviews
                    WHERE restaurant_id IN (${sql.join(restaurantIds.map((id) => sql`${id}`), sql`, `)})
                    GROUP BY restaurant_id, keyword
                )
                SELECT restaurant_id, keyword, count
                FROM ranked_keywords
                WHERE rank <= 3
                ORDER BY restaurant_id ASC, rank ASC
            `);

            for (const row of keywordRows.rows) {
                const restaurantId = Number(row.restaurant_id);
                const bucket = topKeywordMap.get(restaurantId) ?? [];
                bucket.push({
                    keyword: String(row.keyword),
                    count: Number(row.count)
                });
                topKeywordMap.set(restaurantId, bucket);
            }
        }

        const listWithKeywords = restaurantList.map((restaurant) => ({
            ...restaurant,
            topKeywords: topKeywordMap.get(restaurant.id) ?? []
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
        return {
            category,
            restaurants: [],
            sort: 'rating',
            currentZone: '전체',
            pagination: { page: 1, totalPages: 1, totalCount: 0 }
        };
    }
};
