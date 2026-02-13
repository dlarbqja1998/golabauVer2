import { AUTH_KAKAO_ID, AUTH_URL } from '$env/static/private';

export const load = async () => {
    // .env에 있는 비밀 키를 화면(프론트)에서 쓸 수 있게 넘겨줍니다.
    return {
        kakaoClientId: AUTH_KAKAO_ID,
        // 배포 후에도 작동하도록 AUTH_URL(도메인)을 활용
        redirectUri: `${AUTH_URL}/auth/callback/kakao`
    };
};