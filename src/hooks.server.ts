// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
    const path = event.url.pathname;

    // 🛑 [비용 폭탄 방지 1단계] 정적 자원, 내부 스크립트 등은 DB 조회 절대 금지!
    // path에 '.'이 포함되어 있거나(이미지, 폰트 등), /_app/ 경로면 쿠키가 있든 없든 바로 통과시킵니다.
    // 이 두 줄이 Neon DB 서브리퀘스트 100만 회를 막아주는 핵심 방패입니다.
    if (path.startsWith('/_app') || path.includes('.')) {
        return await resolve(event);
    }

    // 1. 쿠키에서 세션 ID 가져오기
    const sessionId = event.cookies.get('session_id');

    // 로그인 안 했으면 그냥 통과
    if (!sessionId) {
        return await resolve(event);
    }

    // 🛑 [비용 폭탄 방지 2단계] 진짜 페이지(HTML)나 API를 요청할 때만 DB에 1번만 접근!
    const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(sessionId))
    });

    // 3. 유저가 있으면 event.locals에 저장
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

        // 온보딩 도망자 강제 납치 예외 경로
        const isAllowedPath = 
            path === '/register' || 
            path.startsWith('/auth') || 
            path === '/login'; 

        // 온보딩 안 한 놈이 허락되지 않은 페이지를 어슬렁거린다?! -> 바로 납치!
        if (!user.isOnboarded && !isAllowedPath) {
            console.log(`[보안] 온보딩 미완료자 감지! /register 로 강제 이송 (${path})`);
            
            return new Response(null, {
                status: 303,
                headers: { location: '/register' }
            });
        }
    }

    return await resolve(event);
};