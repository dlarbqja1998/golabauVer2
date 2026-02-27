import { db } from '$lib/server/db';
import { golabassyuPosts, users, postLikes, golabassyuComments, ratings } from '../../db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    // ... 기존 코드 동일 ...
    const currentUser = locals.user;
    const currentUserId = currentUser ? currentUser.id : 0;

    const posts = await db.select({
        id: golabassyuPosts.id,
        restaurantId: golabassyuPosts.restaurantId,
        restaurant: golabassyuPosts.restaurantName,
        rating: golabassyuPosts.rating,
        title: golabassyuPosts.title,
        content: golabassyuPosts.content,
        imageUrl: golabassyuPosts.imageUrl,
        area: golabassyuPosts.area,
        likes: golabassyuPosts.likes,
        createdAt: golabassyuPosts.createdAt,
        userId: golabassyuPosts.userId,
        writerName: users.nickname,
        writerBadge: users.badge,
        commentCount: sql<number>`(
            SELECT count(*) FROM ${golabassyuComments} 
            WHERE ${golabassyuComments.postId} = ${golabassyuPosts.id}
        )`.mapWith(Number) 
    })
    .from(golabassyuPosts)
    .leftJoin(users, eq(golabassyuPosts.userId, users.id))
    .orderBy(desc(golabassyuPosts.id));

    let myLikedPostIds = new Set();
    if (currentUserId) {
        const myLikes = await db.select().from(postLikes).where(eq(postLikes.userId, currentUserId));
        myLikedPostIds = new Set(myLikes.map(l => l.postId));
    }

    const postsWithStatus = posts.map(post => ({
        ...post,
        isLiked: myLikedPostIds.has(post.id),
        isMine: post.userId === currentUserId
    }));

    return { posts: postsWithStatus, user: currentUser };
};

export const actions: Actions = {
    // ... 기존 updatePost, deletePost 유지 ...
    updatePost: async ({ request, locals }) => {
        /* 기존 코드 동일 */
    },
    deletePost: async ({ request, locals }) => {
        /* 기존 코드 동일 */
    },

    // ▼▼▼ 댓글 삭제 액션 (유지) ▼▼▼
    deleteComment: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        
        const data = await request.formData();
        const commentId = Number(data.get('commentId'));

        if (!commentId) return fail(400, { message: '잘못된 요청입니다.' });

        const comment = await db.query.golabassyuComments.findFirst({
            where: eq(golabassyuComments.id, commentId)
        });

        // 댓글 작성자와 현재 로그인한 유저가 같은지 확인
        if (!comment || comment.userId !== locals.user.id) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuComments).where(eq(golabassyuComments.id, commentId));
        return { success: true };
    }
    // ▼▼▼ toggleCommentLike 삭제 완료 ▼▼▼
};