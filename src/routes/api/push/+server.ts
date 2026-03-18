// =========================================================
//  [src/routes/api/push/+server.ts]
//  푸시 알림 구독 정보 DB 저장 API (빌드 에러 원천 차단 버전)
// =========================================================
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

// 🔥 해결: 여기 있던 webpush.setVapidDetails(...) 코드를 아예 삭제했습니다!
// (DB에 구독 정보만 INSERT 하는 곳이라 초기화가 필요 없습니다)

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { subscription, userId } = await request.json();

        // 중복 구독 방지: 해당 엔드포인트가 이미 있는지 확인
        const existingSub = await db.query.pushSubscriptions.findFirst({
            where: eq(pushSubscriptions.endpoint, subscription.endpoint)
        });

        if (!existingSub) {
            // DB 스키마에 맞춰 구독 정보 Insert
            await db.insert(pushSubscriptions).values({
                userId: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            });
        }

        return json({ success: true, message: '구독 성공' });
    } catch (error) {
        console.error('Push Subscription Error:', error);
        return json({ success: false, error: '구독 실패' }, { status: 500 });
    }
};