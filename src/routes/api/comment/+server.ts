import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
// 👇 [수정 1] schema.ts에 정의된 진짜 이름(golabassyuComments)으로 가져옵니다!
import { golabassyuComments, users } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestEvent } from './$types';

// 댓글 가져오기 (GET)
export async function GET({ url }: RequestEvent) {
    const postId = Number(url.searchParams.get('postId'));
    
    // 👇 [수정 2] comments -> golabassyuComments 로 변경
    const result = await db.select({
        id: golabassyuComments.id,
        content: golabassyuComments.content,
        createdAt: golabassyuComments.createdAt,
        writerName: users.nickname,
        writerBadge: users.badge
    })
    .from(golabassyuComments)
    .leftJoin(users, eq(golabassyuComments.userId, users.id))
    .where(eq(golabassyuComments.postId, postId))
    .orderBy(desc(golabassyuComments.createdAt));

    return json(result);
}

// 댓글 쓰기 (POST)
export async function POST({ request, locals }: RequestEvent) {
    // 👇 [추가] 로그인 안 했으면 댓글 못 쓰게 막기
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content } = await request.json();
    
    // 👇 [수정 3] 임시 유저(1) 대신 진짜 로그인한 유저 ID 사용
    const userId = locals.user.id; 

    // 👇 [수정 4] comments -> golabassyuComments 로 변경
    await db.insert(golabassyuComments).values({
        postId,
        userId,
        content
    });

    return json({ success: true });
}