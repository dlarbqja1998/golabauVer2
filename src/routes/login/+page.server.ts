// src/routes/login/+page.server.ts
import { env } from '$env/dynamic/private'; 

export const load = async () => {
    // 🔥 [보안 패치] ID와 URI를 따로 넘기지 않고, 완성된 URL로 만들어서 넘김
    // 클라이언트는 data.kakaoAuthUrl 로 바로 접속하면 됩니다.
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${env.AUTH_KAKAO_ID}&redirect_uri=${env.AUTH_URL}/auth/callback/kakao&response_type=code`;
    
    return {
        kakaoAuthUrl
    };
};