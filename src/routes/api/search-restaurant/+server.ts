import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { restaurants } from '$lib/server/schema';
import { ilike } from 'drizzle-orm';

export async function GET({ url }: RequestEvent) {
    const query = url.searchParams.get('q');

    // 검색어 없으면 빈 배열 반환
    if (!query) {
        return json([]);
    }

    try {
        // DB에서 검색 (로그 제거됨)
        const result = await db.select()
            .from(restaurants)
            .where(ilike(restaurants.name, `%${query}%`))
            .limit(5);

        return json(result);
    } catch (error) {
        return json({ error: 'DB Error' }, { status: 500 });
    }
}