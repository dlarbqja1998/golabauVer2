// src/routes/api/like/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { golabassyuPosts, postLikes } from '../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

import { deleteKVCache } from '$lib/server/cache';

export async function POST({ request, locals, platform }: RequestEvent) {
    if (!locals.user) {
        return json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { postId, isLiked } = await request.json();
    const userId = locals.user.id; 

    try {
        const existingLike = await db.query.postLikes.findFirst({
            where: and(eq(postLikes.postId, postId), eq(postLikes.userId, userId))
        });

        if (isLiked) {
            // ▼ 좋아요 취소 로직
            if (!existingLike) return json({ error: '좋아요를 누른 적이 없습니다.' }, { status: 400 });

            await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
            await db.update(golabassyuPosts).set({ likes: sql`${golabassyuPosts.likes} - 1` }).where(eq(golabassyuPosts.id, postId));
            
            // 🔥 [캐시 폭파] 공용 피드와 "내 좋아요 목록" 캐시를 동시에 날립니다!
            await deleteKVCache(platform, 'golabassyu_all_posts');
            await deleteKVCache(platform, `user_likes_${userId}`); // 👈 새로 추가된 핵심 로직
            
            return json({ success: true, action: 'unliked' });
        } else {
            // ▼ 좋아요 추가 로직
            if (existingLike) return json({ error: '이미 좋아요를 눌렀습니다.' }, { status: 400 }); 

            await db.insert(postLikes).values({ userId, postId });
            await db.update(golabassyuPosts).set({ likes: sql`${golabassyuPosts.likes} + 1` }).where(eq(golabassyuPosts.id, postId));
            
            // 🔥 [캐시 폭파] 공용 피드와 "내 좋아요 목록" 캐시를 동시에 날립니다!
            await deleteKVCache(platform, 'golabassyu_all_posts');
            await deleteKVCache(platform, `user_likes_${userId}`); // 👈 새로 추가된 핵심 로직
            
            return json({ success: true, action: 'liked' });
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류';
        return json({ error: errorMessage }, { status: 500 });
    }
}