import { db } from '$lib/server/db';
// ▼▼▼ [추가] ratings 테이블 import 확인!
import { golabassyuPosts, users, postLikes, golabassyuComments, ratings } from '../../db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    // ... (load 함수는 기존과 완전히 동일하므로 생략) ...
    // 기존 코드 그대로 두세요!
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
    // [수정됨] 게시글 + 별점 수정
    updatePost: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const postId = Number(data.get('postId'));
        const content = data.get('content')?.toString();
        const rating = Number(data.get('rating')); // [추가] 별점 가져오기

        if (!postId || !content || !rating) return fail(400, { message: '내용과 별점을 입력해주세요.' });

        // 내 글인지 확인
        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, postId)
        });

        if (!post || post.userId !== locals.user.id) {
            return fail(403, { message: '수정 권한이 없습니다.' });
        }

        // 1. 게시글 테이블 업데이트
        await db.update(golabassyuPosts)
            .set({ content, rating }) 
            .where(eq(golabassyuPosts.id, postId));

        // 2. [중요] 식당 평점 테이블(ratings)도 같이 동기화
        // (이 식당에 대해 이 유저가 남긴 평점 점수를 수정)
        if (post.restaurantId) {
            await db.update(ratings)
                .set({ rating })
                .where(
                    and(
                        eq(ratings.userId, locals.user.id),
                        eq(ratings.restaurantId, post.restaurantId)
                    )
                );
        }

        return { success: true };
    },

    // 삭제는 기존과 동일
    deletePost: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        const data = await request.formData();
        const postId = Number(data.get('postId'));

        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, postId)
        });

        if (!post || post.userId !== locals.user.id) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuPosts).where(eq(golabassyuPosts.id, postId));
        return { success: true };
    }
};