// src/lib/server/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '../../db/schema';
import { pgTable, serial, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core';
import { user } from './schema'; // 기존 user 테이블이 있다고 가정

// 1. 여기서 주소가 잘 찍히는지 터미널에서 확인해야 함!
if (!DATABASE_URL) {
    throw new Error('❌ .env 파일에서 DATABASE_URL을 찾을 수 없습니다!');
}
// console.log('✅ DB 연결 시도 중:', DATABASE_URL); // 필요하면 주석 해제해서 확인

const sql = neon(DATABASE_URL);
export const db = drizzle(sql, { schema });

// ▼▼▼ 골라바쓔 게시글 테이블 (추가) ▼▼▼
export const golabassyuPosts = pgTable('golabassyu_posts', {
    id: serial('id').primaryKey(),
    
    // 작성자 정보 (일단 닉네임, 뱃지를 직접 저장. 나중에 user 테이블과 연결해도 됨)
    writerName: text('writer_name').notNull(),
    writerBadge: text('writer_badge').default('뉴비'),
    
    // 글 내용
    restaurant: text('restaurant').notNull(), // 식당 이름
    title: text('title').notNull(),           // 제목
    content: text('content').notNull(),       // 본문
    
    // 이미지 (URL로 저장)
    imageUrl: text('image_url'),
    
    // 부가 정보
    area: text('area').default('전체'),       // 지역 (신정문앞 등)
    likes: integer('likes').default(0),       // 좋아요 수
    createdAt: timestamp('created_at').defaultNow() // 작성일
});

// ▼▼▼ 댓글 테이블 (추가 - 나중을 위해 미리 파둠) ▼▼▼
export const golabassyuComments = pgTable('golabassyu_comments', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').references(() => golabassyuPosts.id), // 어떤 글의 댓글인지
    content: text('content').notNull(),
    writerName: text('writer_name').notNull(),
    createdAt: timestamp('created_at').defaultNow()
});