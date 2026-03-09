// src/routes/roulette/+page.server.ts
import { db } from '$lib/server/db';
import { restaurants } from '../../db/schema';
import type { PageServerLoad } from './$types';
import { getKVCache, setKVCache } from '$lib/server/cache';

export const load: PageServerLoad = async ({ platform }) => {
    const CACHE_KEY = 'roulette_lightweight_restaurants';

    let lightweightList = await getKVCache<any[]>(platform, CACHE_KEY);

    if (!lightweightList) {
        lightweightList = await db.select({
            id: restaurants.id,
            name: restaurants.placeName,
            category: restaurants.mainCategory,
            zone: restaurants.zone,
            rating: restaurants.rating // 🔥 별점 필터링을 위해 추가!
        }).from(restaurants);

        await setKVCache(platform, CACHE_KEY, lightweightList, 604800);
    }

    return {
        restaurants: lightweightList
    };
};