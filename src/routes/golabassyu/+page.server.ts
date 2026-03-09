// src/routes/golabassyu/+page.server.ts
import { db } from '$lib/server/db';
import { golabassyuPosts, users, postLikes, golabassyuComments } from '../../db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

import { containsBadWord } from '$lib/server/badwords'; 
import { getKVCache, setKVCache, deleteKVCache } from '$lib/server/cache';

const CACHE_KEY = 'golabassyu_all_posts';

export const load: PageServerLoad = async ({ locals, platform }) => {
    const currentUser = locals.user;
    const currentUserId = currentUser?.id || 0;

    // 1️⃣ [공용 데이터] 전체 게시글 + 댓글 수 캐시 조회 및 DB 폴백
    let posts = await getKVCache<any[]>(platform, CACHE_KEY);

    if (!posts) {
        posts = await db.select({
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
            userId: golabassyuPosts.userId, // 매핑 시 삭제될 예정
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

        await setKVCache(platform, CACHE_KEY, posts);
    }

    // 2️⃣ [개인화 데이터] 내 좋아요 목록 캐시 조회 및 DB 폴백
    let myLikedPostIds = new Set<number>();

    if (currentUserId) {
        const USER_LIKES_KEY = `user_likes_${currentUserId}`;
        let myLikes = await getKVCache<number[]>(platform, USER_LIKES_KEY);

        if (!myLikes) {
            const likesData = await db.select({ postId: postLikes.postId })
                                    .from(postLikes)
                                    .where(eq(postLikes.userId, currentUserId));
            myLikes = likesData.map(l => l.postId);
            await setKVCache(platform, USER_LIKES_KEY, myLikes); 
        }
        myLikedPostIds = new Set(myLikes);
    }

    // 3️⃣ [보안 및 매핑] 공용 캐시에 개인정보 병합 & 민감 정보 제거
    const postsWithStatus = posts.map(({ userId, ...safePost }) => ({
        ...safePost,
        isLiked: myLikedPostIds.has(safePost.id),
        isMine: userId === currentUserId
    }));

    const safeUser = currentUser ? { 
        id: currentUser.id, 
        nickname: currentUser.nickname, 
        role: currentUser.role 
    } : null;

    return { posts: postsWithStatus, user: safeUser };
};

export const actions: Actions = {
    // ▼▼▼ 게시글 수정 ▼▼▼
    updatePost: async ({ request, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const postId = Number(data.get('postId'));
        const content = data.get('content')?.toString() || '';
        const rating = Number(data.get('rating')) || 0;

        if (!postId) return fail(400, { message: '잘못된 요청입니다.' });
        if (containsBadWord(content)) return fail(400, { message: '욕설이나 비속어는 등록할 수 없습니다.' });

        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, postId)
        });

        if (!post || post.userId !== locals.user.id) {
            return fail(403, { message: '수정 권한이 없습니다.' });
        }

        await db.update(golabassyuPosts)
            .set({ content, rating })
            .where(eq(golabassyuPosts.id, postId));

        // 🔥 [캐시 무효화] 피드 캐시 + 해당 식당 리뷰 캐시 동시 폭파!
        await deleteKVCache(platform, CACHE_KEY);
        if (post.restaurantId) {
            await deleteKVCache(platform, `restaurant_detail_${post.restaurantId}`);
        }

        return { success: true };
    },

    // ▼▼▼ 게시글 삭제 ▼▼▼
    deletePost: async ({ request, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const postId = Number(data.get('postId'));

        if (!postId) return fail(400, { message: '잘못된 요청입니다.' });

        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, postId)
        });

        const isAdmin = locals.user.role === 'admin';
        if (!post || (post.userId !== locals.user.id && !isAdmin)) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuPosts).where(eq(golabassyuPosts.id, postId));

        // 🔥 [캐시 무효화] 피드 캐시 + 해당 식당 리뷰 캐시 동시 폭파!
        await deleteKVCache(platform, CACHE_KEY);
        if (post.restaurantId) {
            await deleteKVCache(platform, `restaurant_detail_${post.restaurantId}`);
        }

        return { success: true };
    },

    // ▼▼▼ 댓글 삭제 ▼▼▼
    deleteComment: async ({ request, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        
        const data = await request.formData();
        const commentId = Number(data.get('commentId'));

        if (!commentId) return fail(400, { message: '잘못된 요청입니다.' });

        // 댓글과 그 댓글이 달린 게시글 정보를 조인해서 한 번에 가져옴 (게시글의 restaurantId 확인을 위해)
        const comment = await db.query.golabassyuComments.findFirst({
            where: eq(golabassyuComments.id, commentId)
        });

        const isAdmin = locals.user.role === 'admin';
        if (!comment || (comment.userId !== locals.user.id && !isAdmin)) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuComments).where(eq(golabassyuComments.id, commentId));

        // 게시글 정보를 가져와서 연관된 식당 캐시를 날림
        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, comment.postId),
            columns: { restaurantId: true }
        });

        // 🔥 [캐시 무효화] 피드 캐시(댓글 수 차감) + 해당 식당 리뷰 캐시 동시 폭파!
        await deleteKVCache(platform, CACHE_KEY);
        if (post && post.restaurantId) {
            await deleteKVCache(platform, `restaurant_detail_${post.restaurantId}`);
        }

        return { success: true };
    }
};