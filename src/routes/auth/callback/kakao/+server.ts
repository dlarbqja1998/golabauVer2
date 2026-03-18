import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '../../../../db/schema'; // 상대경로 확인
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private'; // 🔥 dynamic으로 변경!
import { setKVCache } from '$lib/server/cache';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
    // 1. 인가 코드 확인
    const code = url.searchParams.get('code');
    if (!code) throw error(400, '인가 코드가 없습니다.');

    // 2. 카카오 토큰 요청
    const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.AUTH_KAKAO_ID, // 🔥 env 보따리에서 꺼내기
        client_secret: env.AUTH_KAKAO_SECRET, // 🔥 env 보따리에서 꺼내기
        redirect_uri: `${url.origin}/auth/callback/kakao`,
        code
    });

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: tokenParams
    });

    if (!tokenResponse.ok) throw error(400, '카카오 토큰 발급 실패');
    const tokens = await tokenResponse.json();

    // 3. 카카오 유저 정보 요청
    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const kakaoUser = await userResponse.json();

    const providerId = kakaoUser.id.toString();
    const nickname = kakaoUser.kakao_account?.profile?.nickname || 'Unknown';
    const profileImg = kakaoUser.kakao_account?.profile?.profile_image_url || null;
    const email = kakaoUser.kakao_account?.email || `${providerId}@kakao.com`;

    // 4. DB 조회 및 저장
    let user = await db.query.users.findFirst({
        where: eq(users.providerId, providerId)
    });

    if (!user) {
        // 신규 유저는 isOnboarded가 기본값 false로 들어갑니다.
        const [newUser] = await db.insert(users).values({
            email,
            nickname,
            profileImg,
            provider: 'kakao',
            providerId,
            badge: '신입생'
        }).returning();
        user = newUser;
    }

    // 5. 세션 쿠키 설정
    cookies.set('session_id', user.id.toString(), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 
    });

    // 🔥 6. KV 캐시에 유저 데이터 저장 (비보호 경로에서 DB 안 찌르고 사용!)
    await setKVCache(platform, `user:${user.id}`, {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        profileImg: user.profileImg,
        badge: user.badge,
        isOnboarded: user.isOnboarded,
        role: user.role,
    }, 3600);

    // ▼▼▼ [핵심 변경] 추가 정보 입력 안 했으면 납치! ▼▼▼
    if (!user.isOnboarded) {
        throw redirect(303, '/register');
    }

    // 다 했으면 마이페이지로
    throw redirect(303, '/my');
};