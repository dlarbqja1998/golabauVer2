import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { golabassyuPosts, postLikes } from '../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
    const { postId, isLiked } = await request.json();
    const userId = 1; // 임시: 1호 유저

    try {
        if (isLiked) {
            // 좋아요 취소
            await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
            await db.update(golabassyuPosts).set({ likes: sql`${golabassyuPosts.likes} - 1` }).where(eq(golabassyuPosts.id, postId));
            return json({ success: true, action: 'unliked' });
        } else {
            // 좋아요 추가
            await db.insert(postLikes).values({ userId, postId });
            await db.update(golabassyuPosts).set({ likes: sql`${golabassyuPosts.likes} + 1` }).where(eq(golabassyuPosts.id, postId));
            return json({ success: true, action: 'liked' });
        }
    } catch (e) {
        // 👇 [수정] 안전하게 에러 메시지 꺼내기
        const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류';
        return json({ error: errorMessage }, { status: 500 });
    }
}