// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getKVCache, setKVCache } from '$lib/server/cache';
import { db } from '$lib/server/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, cookies, platform }) => {
    const sessionId = cookies.get('session_id');

    // ============================================================
    // 🔥 [KV 캐시 유저] 보호경로든 비보호경로든, 유저 정보 확보!
    //    hooks.server.ts의 protectedPaths 가드는 그대로 유지됩니다.
    // ============================================================
    let userData = null;

    if (locals.user) {
        // 1) 보호된 경로: hooks.server.ts에서 이미 DB 조회 완료 → 그대로 사용
        userData = {
            id: locals.user.id,
            nickname: locals.user.nickname,
            profileImg: locals.user.profileImg,
        };
    } else if (sessionId) {
        // 2) 비보호 경로(홈, 검색 등): KV 캐시에서 먼저 조회 (DB 비용 0원!)
        const KV_KEY = `user:${sessionId}`;
        const cached = await getKVCache<any>(platform, KV_KEY);

        if (cached) {
            // KV 히트! → DB 안 찌르고 사용하되 프론트엔드 노출용으로 필터링
            userData = {
                id: cached.id,
                nickname: cached.nickname,
                profileImg: cached.profileImg,
            };
        } else {
            // KV 미스 → DB 1회 조회 후 KV에 저장 (다음부터는 KV에서 읽음)
            try {
                const userId = parseInt(sessionId);
                const user = await db.query.users.findFirst({
                    where: eq(users.id, userId)
                });

                if (user) {
                    userData = {
                        id: user.id,
                        nickname: user.nickname,
                        profileImg: user.profileImg,
                    };
                    // KV에 1시간(3600초) 캐싱
                    await setKVCache(platform, KV_KEY, userData, 3600);
                }
            } catch (e) {
                console.error('[layout] KV 미스 후 DB 조회 에러:', e);
            }
        }
    }

    return {
        user: userData,
        hasSession: !!sessionId
    };
};
