// src/routes/api/comment/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { golabassyuComments, users, golabassyuPosts } from '../../../db/schema'; // golabassyuPosts 추가!
import { eq, desc } from 'drizzle-orm';
import type { RequestEvent } from './$types';

import { deleteKVCache } from '$lib/server/cache';

export async function GET({ url }: RequestEvent) {
    // (GET 로직은 기존과 동일하므로 생략 없이 그대로 두시면 됩니다.)
    // ...
}

// 댓글 쓰기 (POST)
export async function POST({ request, locals, platform }: RequestEvent) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content } = await request.json();
    const userId = locals.user.id; 

    await db.insert(golabassyuComments).values({
        postId,
        userId,
        content
    });

    // 🔥 1. 전체 피드 캐시 무효화 (기존)
    await deleteKVCache(platform, 'golabassyu_all_posts');

    // 🔥 2. [추가] 이 글이 속한 식당 상세 캐시도 같이 날려줍니다! (식당 상세페이지 리뷰 목록의 댓글수 갱신을 위해)
    const post = await db.query.golabassyuPosts.findFirst({
        where: eq(golabassyuPosts.id, postId),
        columns: { restaurantId: true }
    });
    
    if (post && post.restaurantId) {
        await deleteKVCache(platform, `restaurant_detail_${post.restaurantId}`);
    }

    return json({ success: true });
}