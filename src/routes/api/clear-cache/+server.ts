import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ platform, request }) => {
    const cacheClearSecret =
        platform?.env?.CACHE_CLEAR_SECRET ||
        platform?.env?.ADMIN_SECRET_KEY ||
        '';
    const requestSecret = request.headers.get('x-cache-clear-secret') || '';

    if (!cacheClearSecret || requestSecret !== cacheClearSecret) {
        return json(
            {
                success: false,
                error: '서버 비밀키가 필요합니다.'
            },
            { status: 403 }
        );
    }

    try {
        const kv = platform?.env?.GOLABAU_CACHE;
        if (!kv) {
            return json({ success: true, message: 'KV Store not found, running locally without persistence cache.' });
        }

        const listResult = await kv.list({ prefix: 'list_' });
        const keysToDelete = listResult.keys.map((k: { name: string }) => k.name);

        keysToDelete.push('roulette_lightweight_restaurants');
        keysToDelete.push('all_restaurants_basic');

        await Promise.allSettled(keysToDelete.map((key: string) => kv.delete(key)));

        return json({
            success: true,
            deletedCount: keysToDelete.length,
            message: 'All restaurant caches cleared successfully.'
        });
    } catch (e: unknown) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        console.error('Cache clear error:', e);
        return json({ success: false, error }, { status: 500 });
    }
};
