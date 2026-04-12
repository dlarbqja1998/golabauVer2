import { env } from '$env/dynamic/private';

export const load = async ({ url }) => {
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${env.AUTH_KAKAO_ID}&redirect_uri=${env.AUTH_URL}/auth/callback/kakao&response_type=code`;
    const error = url.searchParams.get('error');

    return {
        kakaoAuthUrl,
        loginError: error === 'deleted' ? '탈퇴한 계정입니다. 같은 카카오 계정으로 다시 시작하면 새 계정으로 가입됩니다.' : null
    };
};
