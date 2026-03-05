import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { golabassyuComments, users } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestEvent } from './$types';

// 🔥 캐시 삭제 함수 가져오기
import { deleteKVCache } from '$lib/server/cache';

// 댓글 가져오기 (GET) - 여긴 데이터 변경이 없으니 그대로 둠!
export async function GET({ url }: RequestEvent) {
    const postId = Number(url.searchParams.get('postId'));
    
    const result = await db.select({
        id: golabassyuComments.id,
        content: golabassyuComments.content,
        createdAt: golabassyuComments.createdAt,
        writerName: users.nickname,
        writerBadge: users.badge,
        userId: golabassyuComments.userId 
    })
    .from(golabassyuComments)
    .leftJoin(users, eq(golabassyuComments.userId, users.id))
    .where(eq(golabassyuComments.postId, postId))
    .orderBy(desc(golabassyuComments.createdAt));

    return json(result);
}

// 댓글 쓰기 (POST)
export async function POST({ request, locals, platform }: RequestEvent) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content } = await request.json();
    const userId = locals.user.id; 

    await db.insert(golabassyuComments).values({
        postId,
        userId,
        content
    });

    // 🔥 [캐시 폭파] 댓글 개수가 늘어났으므로 피드 캐시 삭제!
    await deleteKVCache(platform, 'golabassyu_all_posts');

    return json({ success: true });
}