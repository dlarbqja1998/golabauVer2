import webpush from 'web-push';
import { db } from './db';
import { pushSubscriptions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// VAPID 환경변수가 없으면 임시 구동이라도 되도록 에러 우회 처리
try {
    webpush.setVapidDetails(
        env.VAPID_SUBJECT || 'mailto:test@example.com',
        publicEnv.PUBLIC_VITE_VAPID_PUBLIC_KEY as string, 
        env.VAPID_PRIVATE_KEY as string
    );
} catch (e) {
    console.warn("web-push 초기화 실패 (VAPID 키 누락 가능성):", e);
}

/**
 * 특정 유저의 기기(브라우저)로 푸시 알림을 웹푸시 서버를 거쳐 전송합니다.
 */
export async function sendPushNotification(userId: number, title: string, body: string, url: string = '/') {
    try {
        const subs = await db.query.pushSubscriptions.findMany({
            where: eq(pushSubscriptions.userId, userId)
        });

        if (!subs || subs.length === 0) return false;

        const payload = JSON.stringify({ title, body, url });
        let successCount = 0;

        for (const sub of subs) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload);
                successCount++;
            } catch (error: any) {
                // 410 (Gone) 또는 404 (Not Found): 기기에서 백그라운드 푸시 권한 해제/만료 시
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
                }
                console.error(`푸시 발송 실패 (userId: ${userId}):`, error.statusCode);
            }
        }
        return successCount > 0;
    } catch (e) {
        console.error('푸시 전송 코어 에러:', e);
        return false;
    }
}
