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
    const badPaths = ['.php', '.env', '.git', '/wp-admin', '/wp-login', '/admin.php', '/config'];
    if (badPaths.some(bp => path.includes(bp))) {
        console.log(`[방화벽] 스캐너 봇 차단: ${path}`);
        return new Response('Go away 🖕', { status: 403 });
    }

    // =======================================================
    // 🛑 [무료 방화벽 2단계] 비정상적인 브라우저(터미널 봇) 차단
    // =======================================================
    const badAgents = ['curl', 'wget', 'python', 'postman', 'httpclient'];
    if (!userAgent || badAgents.some(ba => userAgent.includes(ba))) {
        console.log(`[방화벽] 비정상 User-Agent 차단: ${userAgent}`);
        return new Response('Only humans allowed 🤖🚫', { status: 403 });
    }

    // =======================================================
    // 🛑 [비용 폭탄 방지] 정적 파일은 DB 조회 금지
    // =======================================================
    if (path.startsWith('/_app') || path.includes('.')) {
        return await resolve(event);
    }

    // =======================================================
    // 🔥 [핵심 방어막] 꼭 필요한 페이지에서만 DB 찌르기!!!
    // =======================================================
    // 라우터 폴더명 기준입니다. 만약 다녀왔슈 게시판 주소가 /board 라면 /golabassyu 대신 /board를 넣으세요!
    const protectedPaths = [
        '/mypage', 
        '/write', 
        '/auth', 
        '/api',         // 문의하기, 좋아요, 댓글 작성 등 모든 백엔드 액션 허용
        '/restaurant',  // 식당 상세페이지 (별점, 키워드 리뷰 허용)
        '/golabassyu'   // 🔥 다녀왔슈 커뮤니티 (좋아요, 댓글 허용)
    ]; 
    
    // 현재 접속한 주소가 위 배열에 포함되어 있는지 확인
    const isProtectedPath = protectedPaths.some(p => path.startsWith(p));

    // 보호된 주소가 아니라면 (예: 메인화면 '/', 식당리스트 '/list/한식')
    // DB 찌르지 말고 바로 렌더링해서 보내버림 (DB 요금 0원!)
    if (!isProtectedPath) {
        return await resolve(event); 
    }

    // =======================================================
    // 👇 이하 로그인 유저 확인 로직 (보호된 경로에서만 실행됨!)
    // =======================================================
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