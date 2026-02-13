// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
            // 여기에 user 타입을 정의해줍니다.
            user?: {
                id: number;
                nickname: string;
                email: string;
                profileImg: string | null;
                badge: string | null;
            }
        }
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};