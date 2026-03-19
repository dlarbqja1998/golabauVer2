// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { getUserBySessionId } from '$lib/server/user';

export const load: LayoutServerLoad = async ({ locals, cookies, platform }) => {
    const sessionId = cookies.get('session_id');
    let userData = null;

    if (locals.user) {
        userData = {
            id: locals.user.id,
            nickname: locals.user.nickname,
            profileImg: locals.user.profileImg
        };
    } else if (sessionId) {
        const user = await getUserBySessionId(platform, sessionId);
        if (user) {
            userData = {
                id: user.id,
                nickname: user.nickname,
                profileImg: user.profileImg
            };
        }
    }

    return {
        user: userData,
        hasSession: !!sessionId
    };
};
