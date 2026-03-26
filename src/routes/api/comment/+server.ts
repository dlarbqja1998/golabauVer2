// src/routes/api/comment/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { golabassyuComments, users, golabassyuPosts } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestEvent } from './$types';

import { deleteKVCache, getKVCache, setKVCache } from '$lib/server/cache';

function getCommentsCacheKey(postId: number) {
    return `post_comments_${postId}`;
}

export async function GET({ url, platform }: RequestEvent) {
    const postId = Number(url.searchParams.get('postId'));

    if (!postId) {
        return json({ error: 'Invalid postId' }, { status: 400 });
    }

    const cacheKey = getCommentsCacheKey(postId);
    const cachedComments = await getKVCache<{
        id: number;
        postId: number;
        userId: number;
        content: string;
        createdAt: string | null;
        writerName: string | null;
    }[]>(platform, cacheKey);

    if (cachedComments) {
        return json(cachedComments);
    }

    const comments = await db
        .select({
            id: golabassyuComments.id,
            postId: golabassyuComments.postId,
            userId: golabassyuComments.userId,
            content: golabassyuComments.content,
            createdAt: golabassyuComments.createdAt,
            writerName: users.nickname
        })
        .from(golabassyuComments)
        .leftJoin(users, eq(golabassyuComments.userId, users.id))
        .where(eq(golabassyuComments.postId, postId))
        .orderBy(desc(golabassyuComments.createdAt));

    await setKVCache(platform, cacheKey, comments, 300);

    return json(comments);
}

export async function POST({ request, locals, platform }: RequestEvent) {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, content } = await request.json();
    const normalizedPostId = Number(postId);
    const trimmedContent = content?.trim();
    const userId = locals.user.id;

    if (!normalizedPostId || !trimmedContent) {
        return json({ error: 'Invalid payload' }, { status: 400 });
    }

    const [insertedComment] = await db.insert(golabassyuComments).values({
        postId: normalizedPostId,
        userId,
        content: trimmedContent
    }).returning({
        id: golabassyuComments.id,
        postId: golabassyuComments.postId,
        userId: golabassyuComments.userId,
        content: golabassyuComments.content,
        createdAt: golabassyuComments.createdAt
    });

    await deleteKVCache(platform, 'golabassyu_all_posts');
    await deleteKVCache(platform, getCommentsCacheKey(normalizedPostId));

    const post = await db.query.golabassyuPosts.findFirst({
        where: eq(golabassyuPosts.id, normalizedPostId),
        columns: { restaurantId: true }
    });
    
    if (post && post.restaurantId) {
        await deleteKVCache(platform, `restaurant_detail_${post.restaurantId}`);
    }

    return json({
        success: true,
        comment: {
            ...insertedComment,
            writerName: locals.user.nickname
        }
    });
}
