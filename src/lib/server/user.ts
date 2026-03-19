import { db } from '$lib/server/db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { getKVCache, setKVCache } from '$lib/server/cache';

export type CachedUser = typeof users.$inferSelect;

export function getUserCacheKey(sessionId: string) {
    return `user:${sessionId}`;
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
    const cacheKey = getUserCacheKey(sessionId);
    const cachedUser = await getKVCache<CachedUser>(platform, cacheKey);

    if (cachedUser) {
        return cachedUser;
    }

    const userId = Number.parseInt(sessionId, 10);
    if (Number.isNaN(userId)) {
        return null;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    if (user) {
        await setKVCache(platform, cacheKey, user, expirationTtl);
    }

    return user ?? null;
}
