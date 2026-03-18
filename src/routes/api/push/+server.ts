// =========================================================
//  [src/routes/api/push/+server.ts]
//  푸시 알림 구독 정보 DB 저장 API (타입 에러 완벽 해결 버전)
// =========================================================
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types'; //  SvelteKit API 전용 타입 임포트
import webpush from 'web-push';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/schema'; // 방금 schema.ts에 추가했던 테이블
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// VAPID 키 세팅 (as string을 붙여서 TS의 의심을 강제로 잠재움)
webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:test@example.com',
    publicEnv.PUBLIC_VITE_VAPID_PUBLIC_KEY as string, 
    env.VAPID_PRIVATE_KEY as string            // 에러 해결: 무조건 문자열이라고 명시
)
// 1. [POST] 클라이언트에서 받은 구독 정보를 DB에 저장
// ★ 에러 해결: export async function POST 대신 RequestHandler 타입 적용
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
                userId: userId, // 향후 세션에서 가져와야 함
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