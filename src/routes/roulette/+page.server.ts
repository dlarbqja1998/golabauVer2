import { db } from '$lib/server/db';
import { restaurants } from '../../db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
    setHeaders({
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
    });

    const lightweightList = await db
        .select({
            id: restaurants.id,
            name: restaurants.placeName,
            category: restaurants.mainCategory,
            zone: restaurants.zone,
            rating: restaurants.rating
        })
        .from(restaurants);

    return {
        restaurants: lightweightList
    };
};
