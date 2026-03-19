// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
    interface Window {
        posthog?: {
            capture(event: string, properties?: Record<string, unknown>): void;
            identify(id: string, properties?: Record<string, unknown>): void;
            reset(): void;
        };
    }

    namespace App {
        interface Locals {
            user: {
                id: number;
                nickname: string;
                email: string;
                profileImg: string | null;
                badge: string | null;
                isOnboarded: boolean | null;
                role: string | null;
                college?: string | null;
                department?: string | null;
                grade?: string | null;
                gender?: string | null;
                kakaoId?: string | null;
                instaId?: string | null;
            } | null;
        }

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
