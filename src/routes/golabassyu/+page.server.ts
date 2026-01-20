// src/routes/golabassyu/+page.server.ts
import { db } from '$lib/server/db';
import { golabassyuPosts, user } from '$lib/server/schema';
import { desc, eq } from 'drizzle-orm';

export async function load() {
    // DB에서 게시글 몽땅 가져오기 (최신순 정렬)
    const posts = await db.select({
        id: golabassyuPosts.id,
        restaurant: golabassyuPosts.restaurant,
        title: golabassyuPosts.title,
        content: golabassyuPosts.content,
        imageUrl: golabassyuPosts.imageUrl,
        area: golabassyuPosts.area,
        likes: golabassyuPosts.likes,
        createdAt: golabassyuPosts.createdAt,
        
        // 작성자 정보 (유저 테이블이랑 연결해서 가져옴)
        writerName: user.nickname,
        writerBadge: user.badge
    })
    .from(golabassyuPosts)
    .leftJoin(user, eq(golabassyuPosts.userId, user.id)) // 글쓴이 ID로 매칭
    .orderBy(desc(golabassyuPosts.id)); // 최신글이 위로 오게

    return { posts };
}