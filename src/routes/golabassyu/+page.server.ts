import { db } from '$lib/server/db';
import { golabassyuPosts, users, postLikes, golabassyuComments, ratings } from '../../db/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// 🔥 욕설 필터링 함수 (경로 맞춰서 넣어주세요)
import { containsBadWord } from '$lib/server/badwords'; 

export const load: PageServerLoad = async ({ locals, url }) => {
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

// 🔥 [보안 패치] 민감한 userId를 제거하고 isLiked, isMine 상태만 넘김
    const postsWithStatus = posts.map(post => {
        const { userId, ...safePost } = post; // userId를 객체에서 분리 (노출 방지)
        return {
            ...safePost,
            isLiked: myLikedPostIds.has(post.id),
            isMine: post.userId === currentUserId
        };
    });

    // 🔥 [보안 패치] 현재 유저의 전체 정보(비밀번호 해시, 전화번호 등) 노출 방지
    const safeUser = currentUser ? { 
        id: currentUser.id, 
        nickname: currentUser.nickname, 
        role: currentUser.role 
    } : null;

    return { posts: postsWithStatus, user: safeUser };
};

export const actions: Actions = {
    // ▼▼▼ 게시글 수정 로직 완비 ▼▼▼
    updatePost: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const postId = Number(data.get('postId'));
        const content = data.get('content')?.toString() || '';
        const rating = Number(data.get('rating')) || 0;

        if (!postId) return fail(400, { message: '잘못된 요청입니다.' });
        if (containsBadWord(content)) return fail(400, { message: '욕설이나 비속어는 등록할 수 없습니다.' });

        // 1. 해당 게시글이 진짜 있는지 찾기
        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, postId)
        });

        // 2. [보안] 글 작성자 본인이 맞는지 확인! (QA 조작 방어)
        if (!post || post.userId !== locals.user.id) {
            return fail(403, { message: '수정 권한이 없습니다.' });
        }

        // 3. 진짜 DB 업데이트!
        await db.update(golabassyuPosts)
            .set({ content, rating })
            .where(eq(golabassyuPosts.id, postId));

        return { success: true };
    },

    // ▼▼▼ 게시글 삭제 로직 완비 ▼▼▼
    deletePost: async ({ request, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const postId = Number(data.get('postId'));

        if (!postId) return fail(400, { message: '잘못된 요청입니다.' });

        // 1. 해당 게시글이 진짜 있는지 찾기
        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, postId)
        });

        // 2. [보안] 글 작성자 본인이 맞는지 확인! (QA 조작 방어)
        const isAdmin = locals.user.role === 'admin';
        if (!post || post.userId !== locals.user.id && !isAdmin) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        // 3. 진짜 DB 삭제! (이제 다녀왔슈에서도 영원히 안 보임!)
        await db.delete(golabassyuPosts).where(eq(golabassyuPosts.id, postId));

        return { success: true };
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
        const isAdmin = locals.user.role === 'admin';
        if (!comment || comment.userId !== locals.user.id && !isAdmin) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuComments).where(eq(golabassyuComments.id, commentId));
        return { success: true };
    }
};