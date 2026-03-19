import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/schema';
import { eq } from 'drizzle-orm';

type PushSubscriptionPayload = {
    endpoint?: string;
    keys?: {
        p256dh?: string;
        auth?: string;
    };
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    try {
        const { subscription } = (await request.json()) as {
            subscription?: PushSubscriptionPayload;
            userAgent?: string;
        };

        if (
            !subscription?.endpoint ||
            !subscription.keys?.p256dh ||
            !subscription.keys?.auth
        ) {
            return json({ success: false, error: '잘못된 구독 정보입니다.' }, { status: 400 });
        }

        const existingSub = await db.query.pushSubscriptions.findFirst({
            where: eq(pushSubscriptions.endpoint, subscription.endpoint)
        });

        if (!existingSub) {
            await db.insert(pushSubscriptions).values({
                userId: locals.user.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            });
        } else if (
            existingSub.userId !== locals.user.id ||
            existingSub.p256dh !== subscription.keys.p256dh ||
            existingSub.auth !== subscription.keys.auth
        ) {
            await db
                .update(pushSubscriptions)
                .set({
                    userId: locals.user.id,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth
                })
                .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        }

        return json({ success: true, message: '구독 성공' });
    } catch (error) {
        console.error('Push Subscription Error:', error);
        return json({ success: false, error: '구독 실패' }, { status: 500 });
    }
};
