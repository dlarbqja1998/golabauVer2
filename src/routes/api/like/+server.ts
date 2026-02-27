import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { golabassyuPosts, postLikes } from '../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function POST({ request, locals }: RequestEvent) {
    // 🔥 [핵심 1] 로그인 안 한 유저 컷!
    if (!locals.user) {
        return json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { postId, isLiked } = await request.json();
    const userId = locals.user.id; // 🔥 [핵심 2] 임시 1호 유저 삭제! 진짜 유저 ID 가져오기

    try {
        // 🔥 [핵심 3] 이 유저가 이 게시물에 진짜로 좋아요를 누른 적 있는지 DB 확인
        const existingLike = await db.query.postLikes.findFirst({
            where: and(eq(postLikes.postId, postId), eq(postLikes.userId, userId))
        });

        if (isLiked) {
            // 좋아요 취소 로직
            if (!existingLike) return json({ error: '좋아요를 누른 적이 없습니다.' }, { status: 400 });

            await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
            await db.update(golabassyuPosts).set({ likes: sql`${golabassyuPosts.likes} - 1` }).where(eq(golabassyuPosts.id, postId));
            return json({ success: true, action: 'unliked' });
        } else {
            // 좋아요 추가 로직
            if (existingLike) return json({ error: '이미 좋아요를 눌렀습니다.' }, { status: 400 }); // 무한 클릭 방어!

            await db.insert(postLikes).values({ userId, postId });
            await db.update(golabassyuPosts).set({ likes: sql`${golabassyuPosts.likes} + 1` }).where(eq(golabassyuPosts.id, postId));
            return json({ success: true, action: 'liked' });
        }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : '알 수 없는 오류';
        return json({ error: errorMessage }, { status: 500 });
    }
}