// src/routes/restaurant/[id]/+page.server.ts
import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings, golabassyuPosts, postLikes, golabassyuComments } from '../../../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const restaurantId = Number(params.id);
    const user = locals.user;
    const currentUserId = user ? user.id : 0; 

    try {
        const restaurantData = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
        
        if (!restaurantData || restaurantData.length === 0) {
            return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], reviews: [], user: null };
        }

        // 1. 전체 상위 5개 키워드 통계
        const topKeywords = await db
            .select({ keyword: keywordReviews.keyword, count: sql<number>`count(*)` })
            .from(keywordReviews)
            .where(eq(keywordReviews.restaurantId, restaurantId))
            .groupBy(keywordReviews.keyword)
            .orderBy(desc(sql`count(*)`))
            .limit(5);

        // 2. 내 별점 및 키워드 데이터
        let myRating = null;
        let myKeywords: string[] = [];

        if (user) {
            const ratingData = await db.select()
                .from(ratings)
                .where(and(eq(ratings.restaurantId, restaurantId), eq(ratings.userId, user.id)))
                .limit(1);
            if (ratingData.length > 0) myRating = ratingData[0].rating;

            const keywordData = await db.select()
                .from(keywordReviews)
                .where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, user.id)));
            myKeywords = keywordData.map(r => r.keyword);
        }

        // 3. 이 식당에 작성된 리뷰 가져오기 (댓글 수, 좋아요 수 포함)
        const fetchedReviews = await db.select({
            id: golabassyuPosts.id,
            title: golabassyuPosts.title,
            content: golabassyuPosts.content,
            rating: golabassyuPosts.rating,
            createdAt: golabassyuPosts.createdAt,
            imageUrl: golabassyuPosts.imageUrl,
            likes: golabassyuPosts.likes,
            userId: golabassyuPosts.userId, // 내가 쓴 글인지 판별하기 위해 일단 가져옴
            commentCount: sql<number>`(
                SELECT count(*) FROM ${golabassyuComments} 
                WHERE ${golabassyuComments.postId} = ${golabassyuPosts.id}
            )`.mapWith(Number) 
        })
        .from(golabassyuPosts)
        .where(eq(golabassyuPosts.restaurantId, restaurantId))
        .orderBy(desc(golabassyuPosts.createdAt));

        // [보안 패치] 내가 좋아요 누른 게시글 세팅
        let myLikedPostIds = new Set();
        if (currentUserId) {
            const myLikes = await db.select().from(postLikes).where(eq(postLikes.userId, currentUserId));
            myLikedPostIds = new Set(myLikes.map(l => l.postId));
        }

        // 식당 정보는 프론트에 필요하므로 넘김
        const safeRestaurant = restaurantData[0];

        // [보안 패치] 리뷰 작성자의 userId는 차단하고, isLiked, isMine만 넘김
        const reviews = fetchedReviews.map(rev => {
            const { userId, ...safeRev } = rev; // 🚨 userId 노출 방지!
            return {
                ...safeRev,
                isLiked: myLikedPostIds.has(rev.id),
                isMine: userId === currentUserId
            };
        });

        const safeUser = user ? { id: user.id, role: user.role } : null;

        return { 
            restaurant: safeRestaurant, 
            topKeywords, 
            myRating, 
            myKeywords, 
            reviews,
            user: safeUser
        };

    } catch (error) {
        console.error('식당 정보 로드 에러:', error);
        return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], reviews: [], user: null };
    }
};

export const actions: Actions = {
    // ▼ 별점 등록 로직
    submitRating: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const rating = Number(data.get('rating'));
        const restaurantId = Number(params.id);
        const userId = locals.user.id;

        if (!rating || rating < 1 || rating > 5) return fail(400, {message: '별점은 1점 이상 주셔야 합니다.'});

        try {
            const existingRating = await db.select().from(ratings)
                .where(and(eq(ratings.restaurantId, restaurantId), eq(ratings.userId, userId)))
                .limit(1);

            if (existingRating.length > 0) {
                await db.update(ratings)
                    .set({ rating })
                    .where(eq(ratings.id, existingRating[0].id));
            } else {
                await db.insert(ratings).values({ restaurantId, userId, rating });
            }

            const avgResult = await db.select({ avg: sql<number>`avg(${ratings.rating})` })
                .from(ratings).where(eq(ratings.restaurantId, restaurantId));
            const newAvg = Number(avgResult[0]?.avg || 0);
            
            await db.update(restaurants).set({ rating: newAvg }).where(eq(restaurants.id, restaurantId));

            return { success: true };
        } catch (error) {
            console.error('별점 저장 에러:', error);
            return fail(500);
        }
    },

    // ▼ 키워드 등록 로직
    submitKeyword: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const keywords = data.getAll('keywords') as string[];
        const restaurantId = Number(params.id);
        const userId = locals.user.id;

        try {
            await db.delete(keywordReviews)
                .where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, userId)));

            if (keywords && keywords.length > 0) {
                for (const k of keywords) {
                    await db.insert(keywordReviews).values({ restaurantId, userId, keyword: k });
                }
            }
            return { success: true };
        } catch (error) {
            console.error('키워드 저장 에러:', error);
            return fail(500);
        }
    },

    // ▼ 댓글 삭제 로직
    deleteComment: async ({ request, locals }) => {
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
        return { success: true };
    },

    // ▼ 게시글(리뷰) 삭제 로직
    deletePost: async ({ request, locals }) => {
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

        return { success: true };
    }
};