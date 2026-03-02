// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
    const path = event.url.pathname;
    const userAgent = event.request.headers.get('user-agent')?.toLowerCase() || '';

    // =======================================================
    // 🛑 [무료 방화벽 1단계] 악성 스캐너 봇 즉시 처단 (연산량 0)
    // =======================================================
    // 전 세계 해커 봇들이 찔러보는 대표적인 취약점 주소들입니다.
    const badPaths = ['.php', '.env', '.git', '/wp-admin', '/wp-login', '/admin.php', '/config'];
    if (badPaths.some(bp => path.includes(bp))) {
        console.log(`[방화벽] 스캐너 봇 차단: ${path}`);
        return new Response('Go away 🖕', { status: 403 }); // 403 에러 던지고 바로 연결 끊어버림
    }

    // =======================================================
    // 🛑 [무료 방화벽 2단계] 비정상적인 브라우저(터미널 봇) 차단
    // =======================================================
    // 사람이 아닌 코드로 긁어가는 파이썬, curl, wget 봇들을 차단합니다.
    const badAgents = ['curl', 'wget', 'python', 'postman', 'httpclient'];
    if (!userAgent || badAgents.some(ba => userAgent.includes(ba))) {
        console.log(`[방화벽] 비정상 User-Agent 차단: ${userAgent}`);
        return new Response('Only humans allowed 🤖🚫', { status: 403 });
    }

    // =======================================================
    // 🛑 [비용 폭탄 방지] 정적 파일은 DB 조회 금지 (이전에 추가한 것)
    // =======================================================
    if (path.startsWith('/_app') || path.includes('.')) {
        return await resolve(event);
    }

    // --- (이하 기존 정상 유저 로그인 체크 로직 동일) ---
    const sessionId = event.cookies.get('session_id');

    if (!sessionId) {
        return await resolve(event);
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(sessionId))
    });

    if (user) {
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
            role: user.role 
        };

        const isAllowedPath = 
            path === '/register' || 
            path.startsWith('/auth') || 
            path === '/login'; 

        if (!user.isOnboarded && !isAllowedPath) {
            return new Response(null, {
                status: 303,
                headers: { location: '/register' }
            });
        }
    }

    return await resolve(event);
};