import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { createSessionToken, USER_STATUS } from '$lib/server/user';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const code = url.searchParams.get('code');
    if (!code) throw error(400, '인가 코드가 없습니다.');

    const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: env.AUTH_KAKAO_ID,
        client_secret: env.AUTH_KAKAO_SECRET,
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

    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const kakaoUser = await userResponse.json();

    const providerId = kakaoUser.id.toString();
    const nickname = kakaoUser.kakao_account?.profile?.nickname || 'Unknown';
    const profileImg = kakaoUser.kakao_account?.profile?.profile_image_url || null;
    const email = kakaoUser.kakao_account?.email || `${providerId}@kakao.com`;

    let user = await db.query.users.findFirst({
        where: eq(users.providerId, providerId)
    });

    if (!user) {
        const [newUser] = await db
            .insert(users)
            .values({
                email,
                nickname,
                profileImg,
                provider: 'kakao',
                providerId,
                badge: '신입생'
            })
            .returning();
        user = newUser;
    }

    if (user.status === USER_STATUS.DELETED) {
        throw redirect(303, '/login?error=deleted');
    }

    cookies.set('session_id', createSessionToken(user.id), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
    });

    if (!user.isOnboarded) {
        throw redirect(303, '/register');
    }

    throw redirect(303, '/my');
};
