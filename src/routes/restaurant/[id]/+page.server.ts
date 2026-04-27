// src/routes/restaurant/[id]/+page.server.ts
import { db } from '$lib/server/db';
import { restaurants, keywordReviews, ratings, golabassyuPosts, postLikes, golabassyuComments, users, pointLogs } from '../../../db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// 🔥 KV 캐시 함수 임포트
import { getKVCache, setKVCache, deleteKVCache } from '$lib/server/cache';

export const load: PageServerLoad = async ({ params, locals, platform, request, url, getClientAddress }) => {
    const restaurantId = Number(params.id);
    const user = locals.user;
    const currentUserId = user ? user.id : 0; 
    const CACHE_KEY = `restaurant_detail_${restaurantId}`; // 식당마다 고유 캐시 키 생성!

    try {
        // 1️⃣ [캐시 읽기] 무거운 공통 데이터(식당 정보, 키워드, 리뷰 목록)를 KV에서 꺼내옴
        let cachedData = await getKVCache<any>(platform, CACHE_KEY);

        // 2️⃣ 캐시가 비어있다면 DB에서 긁어와서 KV에 저장!
        if (!cachedData) {
            const restaurantData = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
            
            if (!restaurantData || restaurantData.length === 0) {
                return { restaurant: null, topKeywords: [], myRating: null, myKeywords: [], reviews: [], user: null };
            }

            const topKeywords = await db
                .select({ keyword: keywordReviews.keyword, count: sql<number>`count(*)` })
                .from(keywordReviews)
                .where(eq(keywordReviews.restaurantId, restaurantId))
                .groupBy(keywordReviews.keyword)
                .orderBy(desc(sql`count(*)`))
                .limit(5);

            const fetchedReviews = await db.select({
                id: golabassyuPosts.id,
                title: golabassyuPosts.title,
                content: golabassyuPosts.content,
                rating: golabassyuPosts.rating,
                createdAt: golabassyuPosts.createdAt,
                imageUrl: golabassyuPosts.imageUrl,
                likes: golabassyuPosts.likes,
                userId: golabassyuPosts.userId, 
                commentCount: sql<number>`(
                    SELECT count(*) FROM ${golabassyuComments} 
                    WHERE ${golabassyuComments.postId} = ${golabassyuPosts.id}
                )`.mapWith(Number) 
            })
            .from(golabassyuPosts)
            .where(eq(golabassyuPosts.restaurantId, restaurantId))
            .orderBy(desc(golabassyuPosts.createdAt));

            // 데이터 묶어서 KV에 저장
            cachedData = { safeRestaurant: restaurantData[0], topKeywords, fetchedReviews };
            await setKVCache(platform, CACHE_KEY, cachedData, 86400, {
                source: 'restaurant-detail',
                path: url.pathname,
                userId: user?.id,
                ip:
                    request.headers.get('cf-connecting-ip') ||
                    request.headers.get('x-real-ip') ||
                    getClientAddress(),
                country: request.headers.get('cf-ipcountry'),
                userAgent: request.headers.get('user-agent'),
                cfRay: request.headers.get('cf-ray')
            });
        }

        const { safeRestaurant, topKeywords, fetchedReviews } = cachedData;

        // 🔥 3️⃣ [개인화 처리] 로그인한 유저의 데이터도 KV 캐시를 1순위로 조회하여 DB 찌르기 방어!
        let myRating = null;
        let myKeywords: string[] = [];
        let myLikedPostIds = new Set();

        if (user) {
            // A. 내 좋아요 캐시 가져오기 (골라밧슈 피드와 완벽히 동일한 캐시 공유)
            const USER_LIKES_KEY = `user_likes_${user.id}`;
            let myLikes = await getKVCache<number[]>(platform, USER_LIKES_KEY);
            
            if (!myLikes) {
                const myLikesData = await db.select().from(postLikes).where(eq(postLikes.userId, user.id));
                myLikes = myLikesData.map(l => l.postId);
                await setKVCache(platform, USER_LIKES_KEY, myLikes);
            }
            myLikedPostIds = new Set(myLikes);

            // B. 이 식당에 대한 내 평가(별점/키워드) 캐시 가져오기
            const USER_REST_EVAL_KEY = `user_eval_${user.id}_${restaurantId}`;
            let myEvalData = await getKVCache<any>(platform, USER_REST_EVAL_KEY);

            if (!myEvalData) {
                // 캐시가 없을 때만 진짜 DB를 찌릅니다!
                const ratingData = await db.select()
                    .from(ratings)
                    .where(and(eq(ratings.restaurantId, restaurantId), eq(ratings.userId, user.id)))
                    .limit(1);
                
                const keywordData = await db.select()
                    .from(keywordReviews)
                    .where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, user.id)));
                
                myEvalData = {
                    myRating: ratingData.length > 0 ? ratingData[0].rating : null,
                    myKeywords: keywordData.map(r => r.keyword)
                };
                
                await setKVCache(platform, USER_REST_EVAL_KEY, myEvalData);
            }

            myRating = myEvalData.myRating;
            myKeywords = myEvalData.myKeywords;
        }

        // 4️⃣ [보안] KV에서 꺼낸 리뷰 정보에 내 좋아요/내 글 여부 덮어씌우고 민감한 userId 날리기
        const reviews = fetchedReviews.map((rev: any) => {
            const { userId, ...safeRev } = rev; 
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
    submitRating: async ({ request, params, locals, platform }) => {
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
                await db.update(ratings).set({ rating }).where(eq(ratings.id, existingRating[0].id));
            } else {
                await db.insert(ratings).values({ restaurantId, userId, rating });
                
                // 🔥 다녀왔슈(별점) 최초 작성 시 7P 지급
                await db.update(users).set({ points: sql`${users.points} + 7` }).where(eq(users.id, userId));
                await db.insert(pointLogs).values({ userId, amount: 7, reason: '다녀왔슈 리뷰 작성' });
            }

            const avgResult = await db.select({ avg: sql<number>`avg(${ratings.rating})` })
                .from(ratings).where(eq(ratings.restaurantId, restaurantId));
            const newAvg = Number(avgResult[0]?.avg || 0);
            
            await db.update(restaurants).set({ rating: newAvg }).where(eq(restaurants.id, restaurantId));

            // 🔥 [캐시 폭파] 이 식당의 내 평가(별점) 캐시를 날림!
            await deleteKVCache(platform, `user_eval_${userId}_${restaurantId}`);
            // 🔥 [캐시 폭파] 별점 평균이 바뀌었으므로 이 식당 공용 캐시 날림!
            await deleteKVCache(platform, `restaurant_detail_${restaurantId}`);

            return { success: true };
        } catch (error) {
            return fail(500);
        }
    },

    // ▼ 키워드 등록 로직
    submitKeyword: async ({ request, params, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const keywords = data.getAll('keywords') as string[];
        const restaurantId = Number(params.id);
        const userId = locals.user.id;

        try {
            await db.delete(keywordReviews).where(and(eq(keywordReviews.restaurantId, restaurantId), eq(keywordReviews.userId, userId)));

            if (keywords && keywords.length > 0) {
                for (const k of keywords) {
                    await db.insert(keywordReviews).values({ restaurantId, userId, keyword: k });
                }
            }

            // 🔥 [캐시 폭파] 이 식당의 내 평가(키워드) 캐시를 날림!
            await deleteKVCache(platform, `user_eval_${userId}_${restaurantId}`);
            // 🔥 [캐시 폭파] 키워드 랭킹이 바뀌었으므로 이 식당 공용 캐시 날림!
            await deleteKVCache(platform, `restaurant_detail_${restaurantId}`);

            return { success: true };
        } catch (error) {
            return fail(500);
        }
    },

    // ▼ 댓글 삭제 로직
    deleteComment: async ({ request, locals, platform, params }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });
        
        const data = await request.formData();
        const commentId = Number(data.get('commentId'));
        const restaurantId = Number(params.id);

        if (!commentId) return fail(400, { message: '잘못된 요청입니다.' });

        const comment = await db.query.golabassyuComments.findFirst({
            where: eq(golabassyuComments.id, commentId)
        });

        const isAdmin = locals.user.role === 'admin';
        if (!comment || (comment.userId !== locals.user.id && !isAdmin)) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuComments).where(eq(golabassyuComments.id, commentId));

        // 🔥 [캐시 폭파] 리뷰의 댓글 수가 줄었으니 식당 상세 공용 캐시와 골라밧슈 피드 캐시 터뜨림!
        await deleteKVCache(platform, `post_comments_${comment.postId}`);
        await deleteKVCache(platform, `restaurant_detail_${restaurantId}`);
        await deleteKVCache(platform, 'golabassyu_all_posts');

        return { success: true };
    },

    // ▼ 게시글(리뷰) 삭제 로직
    deletePost: async ({ request, locals, platform, params }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요합니다.' });

        const data = await request.formData();
        const postId = Number(data.get('postId'));
        const restaurantId = Number(params.id);

        if (!postId) return fail(400, { message: '잘못된 요청입니다.' });

        const post = await db.query.golabassyuPosts.findFirst({
            where: eq(golabassyuPosts.id, postId)
        });

        const isAdmin = locals.user.role === 'admin';
        if (!post || (post.userId !== locals.user.id && !isAdmin)) {
            return fail(403, { message: '삭제 권한이 없습니다.' });
        }

        await db.delete(golabassyuPosts).where(eq(golabassyuPosts.id, postId));

        // 🔥 [캐시 폭파] 게시글이 지워졌으니 상세 공용 캐시, 메인 피드 공용 캐시 동시 폭파!
        await deleteKVCache(platform, `restaurant_detail_${restaurantId}`);
        await deleteKVCache(platform, 'golabassyu_all_posts');

        return { success: true };
    }
};
