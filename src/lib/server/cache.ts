// src/lib/server/cache.ts

// 1. 캐시 불러오기
export async function getKVCache<T>(platform: App.Platform | undefined, key: string): Promise<T | null> {
    // 로컬 환경이거나 KV가 연결 안 되어 있으면 그냥 패스! (에러 방지)
    if (!platform?.env?.GOLABAU_CACHE) return null; 

    try {
        const cached = await platform.env.GOLABAU_CACHE.get(key);
        if (cached) {
            return JSON.parse(cached) as T;
        }
    } catch (e) {
        console.error(`KV 캐시 불러오기 실패 (${key}):`, e);
    }
    return null;
}

// 2. 캐시 저장하기
export async function setKVCache(platform: App.Platform | undefined, key: string, data: any, expirationTtl = 86400) {
    if (!platform?.env?.GOLABAU_CACHE) return;
    
    try {
        // 기본적으로 1일(86400초) 동안 저장해둡니다. (어차피 새 글 쓰면 우리가 강제로 폭파시킬 거라 넉넉하게 잡음)
        await platform.env.GOLABAU_CACHE.put(key, JSON.stringify(data), { expirationTtl });
    } catch (e) {
        console.error(`KV 캐시 저장 실패 (${key}):`, e);
    }
}

// 3. 캐시 폭파시키기 (무효화) - 누군가 글/댓글 썼을 때 호출할 함수!
export async function deleteKVCache(platform: App.Platform | undefined, key: string) {
    if (!platform?.env?.GOLABAU_CACHE) return;

    try {
        await platform.env.GOLABAU_CACHE.delete(key);
        console.log(`💥 KV 캐시 폭파 완료! (${key}) - 다음 접속자는 최신 DB를 보게 됩니다.`);
    } catch (e) {
        console.error(`KV 캐시 폭파 실패 (${key}):`, e);
    }
}