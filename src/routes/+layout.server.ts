// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
    // 세션 쿠키가 있는지 확인 (비용 0원!)
    const sessionId = cookies.get('session_id');

    return {
        // hooks.server.ts에서 가져온 유저 정보 (보호된 경로에서만 존재)
        user: locals.user ? {
            id: locals.user.id,
            nickname: locals.user.nickname,
        } : null,
        
        // 🔥 진짜 로그인 상태인지 여부 (이걸로 PostHog 초기화 방지)
        hasSession: !!sessionId 
    };
};