import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
// 👇 경로 주의! 우리가 쓰는 schema.ts 위치로 맞춰주세요.
// (보통 src/db/schema.ts라면 ../../../db/schema 가 맞을 수 있습니다.)
import { restaurants } from '../../../db/schema'; 
import { ilike } from 'drizzle-orm';

export async function GET({ url }: RequestEvent) {
    const query = url.searchParams.get('q');

    // 검색어 없으면 빈 배열 반환
    if (!query) {
        return json([]);
    }

    try {
        // ▼▼▼ 핵심 수정 부분 ▼▼▼
        const result = await db.select({
            id: restaurants.id,
            // DB의 'placeName'을 프론트엔드가 원하는 'name'으로 바꿔서 보냄
            name: restaurants.placeName, 
            // 카테고리도 프론트엔드에 맞춰서 보냄 (DB 컬럼명 확인 필요!)
            mainCategory: restaurants.mainCategory 
        })
        .from(restaurants)
        .where(ilike(restaurants.placeName, `%${query}%`))
        .limit(10); // 5개는 너무 적으니 10개로

        return json(result);
    } catch (error) {
        console.error('검색 에러:', error);
        return json({ error: 'DB Error' }, { status: 500 });
    }
}