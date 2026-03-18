// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            // 여기에 user 타입을 정의해줍니다.
            user: {
                id: number;
                nickname: string;
                email: string;
                profileImg: string | null;
                badge: string | null;
                isOnboarded: boolean | null; // 🔥 이거 한 줄 추가된 거!
                role: string | null; // 🔥 여기에 role을 추가!
            } | null;
        }
        // interface PageData {}
        // interface PageState {}
        interface Platform {
            env: {
                GOLABAU_CACHE: KVNamespace;
            };
            context: {
                waitUntil(promise: Promise<any>): void;
            };
            caches: CacheStorage & { default: Cache };
        }
    }
}

export { };