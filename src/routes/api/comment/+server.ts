// src/routes/api/comment/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
// 👇 족보 위치 정확하게 맞춤
import { comments, users } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
// 👇 [추가] 타입 명찰 가져오기
import type { RequestEvent } from './$types';

// 댓글 가져오기
// 👇 [수정] url 옆에 명찰 붙임
export async function GET({ url }: RequestEvent) {
    const postId = Number(url.searchParams.get('postId'));
    
    const result = await db.select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        writerName: users.nickname,
        writerBadge: users.badge
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));

    return json(result);
}

// 댓글 쓰기
// 👇 [수정] request 옆에 명찰 붙임
export async function POST({ request }: RequestEvent) {
    const { postId, content } = await request.json();
    const userId = 1; // 임시 유저

    await db.insert(comments).values({
        postId,
        userId,
        content
    });

    return json({ success: true });
}