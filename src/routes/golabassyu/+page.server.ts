// src/routes/golabassyu/+page.server.ts
import { db } from '$lib/server/db';
import { golabassyuPosts, users, postLikes, golabassyuComments, ratings } from '../../db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// 🔥 욕설 필터링 함수 (경로 맞춰서 넣어주세요)
import { containsBadWord } from '$lib/server/badwords'; 

// 🔥 아까 만든 KV 캐시 도우미 함수 불러오기
import { getKVCache, setKVCache, deleteKVCache } from '$lib/server/cache';

const CACHE_KEY = 'golabassyu_all_posts';

export const load: PageServerLoad = async ({ locals, platform }) => {
    const currentUser = locals.user;
    const currentUserId = currentUser ? currentUser.id : 0;

    // 1️⃣ [캐시 읽기] 공용 데이터(전체 게시글 + 댓글 수)를 KV 캐시에서 먼저 찾기!
    let posts = await getKVCache<any[]>(platform, CACHE_KEY);

    // 2️⃣ 캐시가 비어있다면? (누가 글을 썼거나 캐시가 만료된 경우) DB에서 직접 조회 후 저장!
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
            userId: golabassyuPosts.userId, // 여기서 가져온 userId는 마지막에 무조건 삭제함!
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

        // 가져온 무거운 데이터를 KV 캐시에 저장 (다음 사람부터는 DB 조회 안 함)
        await setKVCache(platform, CACHE_KEY, posts);
    }

    // 3️⃣ [개인화 처리] 로그인한 유저라면, 내가 좋아요 누른 글 목록만 DB에서 가볍게 가져옴
    let myLikedPostIds = new Set();
    if (currentUserId) {
        const myLikes = await db.select().from(postLikes).where(eq(postLikes.userId, currentUserId));
        myLikedPostIds = new Set(myLikes.map(l => l.postId));
    }

    // 4️⃣ [보안 패치] 공용 캐시 데이터에 개인정보(isLiked, isMine)를 섞고, 민감한 userId는 찢어버림!
    const postsWithStatus = posts.map(post => {
        const { userId, ...safePost } = post; // 🚨 userId를 객체에서 분리하여 절대 프론트로 노출 안 시킴!
        return {
            ...safePost,
            isLiked: myLikedPostIds.has(post.id),
            isMine: post.userId === currentUserId
        };
    });

    // 5️⃣ [보안 패치] 현재 유저의 전체 정보 노출 방지
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

        // [보안] 글 작성자 본인이 맞는지 확인!
        if (!post || post.userId !== locals.user.id) {
            return fail(403, { message: '수정 권한이 없습니다.' });
        }

        // 진짜 DB 업데이트!
        await db.update(golabassyuPosts)
            .set({ content, rating })
            .where(eq(golabassyuPosts.id, postId));

        // 🔥 [캐시 폭파] 내용이 바뀌었으니 캐시를 날려버림!
        await deleteKVCache(platform, CACHE_KEY);

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

        // DB 삭제!
        await db.delete(golabassyuPosts).where(eq(golabassyuPosts.id, postId));

        // 🔥 [캐시 폭파] 글이 지워졌으니 캐시를 날려버림!
        await deleteKVCache(platform, CACHE_KEY);

        return { success: true };
    },

    // ▼▼▼ 댓글 삭제 ▼▼▼
    deleteComment: async ({ request, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        
        const data = await request.formData();
        const commentId = Number(data.get('commentId'));

        if (!commentId) return fail(400, { message: '잘못된 요청입니다.' });

        const comment = await db.query.golabassyuComments.findFirst({
            where: eq(golabassyuComments.id, commentId)
        });

        const isAdmin = locals.user.role === 'admin';
        if (!comment || (comment.userId !== locals.user.id && !isAdmin)) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuComments).where(eq(golabassyuComments.id, commentId));

        // 🔥 [캐시 폭파] 전체 게시물 배열에 `commentCount`(댓글 수)가 포함되어 있으므로 캐시를 날려야 숫자가 깎임!
        await deleteKVCache(platform, CACHE_KEY);

        return { success: true };
    }
};