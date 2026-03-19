// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { getUserBySessionId, isMeetupProfileComplete } from '$lib/server/user';

export const handle: Handle = async ({ event, resolve }) => {
    const path = event.url.pathname;
    const userAgent = event.request.headers.get('user-agent')?.toLowerCase() || '';

    const badPaths = ['.php', '.env', '.git', '/wp-admin', '/wp-login', '/admin.php', '/config'];
    if (badPaths.some((badPath) => path.includes(badPath))) {
        console.log(`[방화벽] 비정상 경로 차단: ${path}`);
        return new Response('Go away', { status: 403 });
    }

    const badAgents = ['curl', 'wget', 'python', 'postman', 'httpclient'];
    if (!userAgent || badAgents.some((badAgent) => userAgent.includes(badAgent))) {
        console.log(`[방화벽] 비정상 User-Agent 차단: ${userAgent}`);
        return new Response('Only humans allowed', { status: 403 });
    }

    if (path.startsWith('/_app') || path.includes('.')) {
        return resolve(event);
    }

    const protectedPaths = ['/my', '/write', '/auth', '/api', '/restaurant', '/golabassyu', '/meetup'];
    const isProtectedPath = protectedPaths.some((protectedPath) => path.startsWith(protectedPath));

    if (!isProtectedPath) {
        return resolve(event);
    }

    const sessionId = event.cookies.get('session_id');
    if (!sessionId) {
        return resolve(event);
    }

    const user = await getUserBySessionId(event.platform, sessionId);
    if (!user) {
        return resolve(event);
    }

    if (user.isBanned) {
        return new Response('차단된 사용자입니다.', { status: 403 });
    }

    event.locals.user = {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        profileImg: user.profileImg,
        badge: user.badge,
        isOnboarded: user.isOnboarded,
        role: user.role,
        college: user.college,
        department: user.department,
        grade: user.grade,
        gender: user.gender,
        kakaoId: user.kakaoId,
        instaId: user.instaId
    };

    const isAllowedPath = path === '/register' || path.startsWith('/auth') || path === '/login';
    if (!user.isOnboarded && !isAllowedPath) {
        return new Response(null, {
            status: 303,
            headers: { location: '/register' }
        });
    }

    if (path.startsWith('/meetup') && !isMeetupProfileComplete(user)) {
        return new Response(null, {
            status: 303,
            headers: { location: '/my?error=meetup_profile' }
        });
    }

    return resolve(event);
};
