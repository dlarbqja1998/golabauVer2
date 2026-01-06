// src/routes/list/[category]/+page.server.ts
import { db } from '$lib/server';
import { restaurants } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    // 1. URL에서 카테고리 이름 가져오기 (예: '한식')
    const categoryName = params.category;

    console.log(`검색하려는 카테고리: ${categoryName}`); // 터미널 로그 확인용

    // 2. DB에서 검색 (SELECT * FROM restaurants WHERE main_category = '한식')
    const list = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.main_category, categoryName));

    // 3. 데이터 반환
    return {
        categoryName,
        restaurantList: list
    };
};