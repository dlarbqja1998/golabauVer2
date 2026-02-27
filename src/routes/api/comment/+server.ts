import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { golabassyuComments, users } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestEvent } from './$types';

// 댓글 가져오기 (GET)
export async function GET({ url }: RequestEvent) {
    const postId = Number(url.searchParams.get('postId'));
    
    const result = await db.select({
        id: golabassyuComments.id,
        content: golabassyuComments.content,
        createdAt: golabassyuComments.createdAt,
        writerName: users.nickname,
        writerBadge: users.badge,
        // 🔥 [추가] 프론트에서 본인 댓글인지 확인하기 위해 반드시 필요합니다!
        userId: golabassyuComments.userId 
    })
    .from(golabassyuComments)
    .leftJoin(users, eq(golabassyuComments.userId, users.id))
    .where(eq(golabassyuComments.postId, postId))
    .orderBy(desc(golabassyuComments.createdAt));

    return json(result);
}

// 댓글 쓰기 (POST)
export async function POST({ request, locals }: RequestEvent) {
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

    return json({ success: true });
}