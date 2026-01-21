import { db } from '$lib/server/db';
// 👇 comments 테이블도 import 해야 개수를 셀 수 있습니다.
import { golabassyuPosts, users, postLikes, comments } from '../../db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function load() {
    const currentUserId = 1; // 임시 유저 ID

    const posts = await db.select({
        id: golabassyuPosts.id,
        restaurant: golabassyuPosts.restaurantName,
        rating: golabassyuPosts.rating,
        title: golabassyuPosts.title,
        content: golabassyuPosts.content,
        imageUrl: golabassyuPosts.imageUrl,
        area: golabassyuPosts.area,
        likes: golabassyuPosts.likes,
        createdAt: golabassyuPosts.createdAt,
        writerName: users.nickname,
        writerBadge: users.badge,
        // ★ [추가] 댓글 개수 세기 (서브쿼리 방식)
        commentCount: sql<number>`(
            SELECT count(*) FROM ${comments} 
            WHERE ${comments.postId} = ${golabassyuPosts.id}
        )`.mapWith(Number) 
    })
    .from(golabassyuPosts)
    .leftJoin(users, eq(golabassyuPosts.userId, users.id))
    .orderBy(desc(golabassyuPosts.id));

    // 내가 좋아요 누른 글 확인
    const myLikes = await db.select().from(postLikes).where(eq(postLikes.userId, currentUserId));
    const myLikedPostIds = new Set(myLikes.map(l => l.postId));

    const postsWithStatus = posts.map(post => ({
        ...post,
        isLiked: myLikedPostIds.has(post.id)
    }));

    return { posts: postsWithStatus };
}