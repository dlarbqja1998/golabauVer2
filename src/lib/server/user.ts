import { db } from '$lib/server/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type CachedUser = typeof users.$inferSelect;

function getSessionSecret() {
    const secret = env.SESSION_SECRET || env.AUTH_KAKAO_SECRET;
    if (!secret) {
        throw new Error('SESSION_SECRET or AUTH_KAKAO_SECRET is required');
    }

    return secret;
}

function signSessionValue(value: string) {
    return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

export function createSessionToken(userId: number) {
    const value = String(userId);
    const signature = signSessionValue(value);
    return `${value}.${signature}`;
}

export function getUserIdFromSessionToken(sessionToken: string) {
    const [value, signature] = sessionToken.split('.');
    if (!value || !signature) {
        return null;
    }

    const expectedSignature = signSessionValue(value);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
        return null;
    }

    const isValid = timingSafeEqual(signatureBuffer, expectedBuffer);
    if (!isValid) {
        return null;
    }

    const userId = Number.parseInt(value, 10);
    return Number.isNaN(userId) ? null : userId;
}

export function isMeetupProfileComplete(
    user: Pick<CachedUser, 'nickname' | 'grade' | 'college' | 'department' | 'gender' | 'kakaoId' | 'instaId'>
) {
    const hasNickname = !!user.nickname?.trim();
    const hasMajor = !!(user.college && user.department);
    const hasContact = !!(user.kakaoId || user.instaId);

    return hasNickname && !!user.grade && !!user.gender && hasMajor && hasContact;
}

export async function getUserBySessionId(
    platform: App.Platform | undefined,
    sessionId: string,
    expirationTtl = 3600
): Promise<CachedUser | null> {
    void platform;
    void expirationTtl;

    const userId = getUserIdFromSessionToken(sessionId);
    if (!userId) {
        return null;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    return user ?? null;
}
