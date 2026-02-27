import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
    // 1. 쿠키에서 세션 ID 가져오기
    const sessionId = event.cookies.get('session_id');

    if (!sessionId) {
        // 로그인 안 했으면 그냥 통과
        return await resolve(event);
    }

    // 2. DB에서 유저 찾기
    const user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(sessionId))
    });

    // 3. 유저가 있으면 event.locals에 저장
    if (user) {
        event.locals.user = {
            id: user.id,
            nickname: user.nickname,
            email: user.email,
            profileImg: user.profileImg,
            badge: user.badge,
            isOnboarded: user.isOnboarded // 🔥 [핵심 1] 온보딩 했는지 안 했는지 정보 추가!
        };

        // 🔥 [핵심 2] 온보딩 도망자 강제 납치 로직
        const path = event.url.pathname;

        // 예외 처리: 회원가입 페이지, 카카오 인증, 로그인, 정적 파일(이미지 등)은 무한 루프 방지를 위해 통과시킴
        const isAllowedPath = 
            path === '/register' || 
            path.startsWith('/auth') || 
            path === '/login' || 
            path.startsWith('/_app') || 
            path.includes('.'); 

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