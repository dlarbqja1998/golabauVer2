import { db } from '$lib/server/db';
import { golabassyuPosts, ratings } from '../../../db/schema'; // 경로 확인
import { redirect, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const actions = {
    createPost: async ({ request, locals }: RequestEvent) => {
        // 1. 로그인 체크 (로그인 안 했으면 쫓아냄)
        if (!locals.user) {
            throw redirect(303, '/login');
        }

        const data = await request.formData();
        
        // 폼 데이터 가져오기
        const area = data.get('area')?.toString() || '전체';
        const restaurantName = data.get('restaurantName')?.toString() || '';
        const restaurantId = Number(data.get('restaurantId')); 
        const rating = Number(data.get('rating')) || 0;        
        const title = data.get('title')?.toString() || '';
        const content = data.get('content')?.toString() || '';
        const imageUrl = data.get('imageUrl')?.toString() || null;

        try {
            // 2. 게시글 저장 (userId에 진짜 로그인한 유저 ID 넣음)
            await db.insert(golabassyuPosts).values({
                userId: locals.user.id, // 👈 여기가 핵심! (1 대신 진짜 ID)
                restaurantName: restaurantName,
                restaurantId: restaurantId,
                rating: rating,
                title: title,
                content: content,
                imageUrl: imageUrl,
                area: area,
                likes: 0
            });

            // 3. 식당 평점 연동 (ratings 테이블)
            // (주의: restaurantId가 실제 DB에 없는 가짜 ID면 에러 날 수 있으므로 예외처리)
            if (restaurantId && restaurantId > 0 && rating > 0) {
                try {
                    // ▼▼▼ [수정] userId: locals.user.id 추가! ▼▼▼
                    await db.insert(ratings).values({
                        restaurantId: restaurantId,
                        rating: rating,
                        userId: locals.user.id, // 👈 이걸 넣어줘야 빨간 줄이 사라집니다.
                    });
                } catch (e) {
                    console.error("평점 반영 실패 (식당 ID 불일치 등):", e);
                    // 평점 실패해도 글은 써지게 둠
                }
            }

        } catch (err) {
            console.error('글쓰기 에러:', err);
            return fail(500, { message: '글 저장에 실패했습니다.' });
        }

        throw redirect(303, '/golabassyu');
    }
};