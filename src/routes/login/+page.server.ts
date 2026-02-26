import { env } from '$env/dynamic/private'; // 🔥 dynamic으로 변경!

export const load = async () => {
    // .env에 있는 비밀 키를 화면(프론트)에서 쓸 수 있게 넘겨줍니다.
    return {
        kakaoClientId: env.AUTH_KAKAO_ID, // 🔥 env 보따리에서 꺼내기
        // 배포 후에도 작동하도록 AUTH_URL(도메인)을 활용
        redirectUri: `${env.AUTH_URL}/auth/callback/kakao` // 🔥 env 보따리에서 꺼내기
    };
};