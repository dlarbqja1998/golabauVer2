import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ platform }) => {
    try {
        const kv = platform?.env?.GOLABAU_CACHE;
        if (!kv) {
            return json({ success: true, message: 'KV Store not found, running locally without persistence cache.' });
        }

        // 1. 카테고리/지역/정렬별로 잘게 쪼개진 식당 리스트('list_') 캐시 키들 전체 조회
        const listResult = await kv.list({ prefix: 'list_' });
        const keysToDelete = listResult.keys.map((k: any) => k.name);
        
        // 2. 룰렛 및 기본 전체 리스트 키도 포함
        keysToDelete.push('roulette_lightweight_restaurants');
        keysToDelete.push('all_restaurants_basic');

        // 3. 일괄 삭제
        await Promise.allSettled(keysToDelete.map((key: string) => kv.delete(key)));

        return json({ success: true, deletedCount: keysToDelete.length, message: 'All restaurant caches cleared successfully.' });
    } catch (e: any) {
        console.error('Cache clear error:', e);
        return json({ success: false, error: e.message }, { status: 500 });
    }
};
