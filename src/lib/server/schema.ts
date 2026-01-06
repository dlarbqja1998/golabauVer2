// src/lib/server/schema.ts
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';

// 기존 유저 테이블
export const user = pgTable('user', { id: serial('id').primaryKey(), age: integer('age') });

// ▼▼▼ 여기 추가 (맛집 테이블 정의) ▼▼▼
export const restaurants = pgTable('restaurants', {
    id: serial('id').primaryKey(),
    name: text('place_name').notNull(),         // 식당 이름 (DB 컬럼명이 다르면 수정 필요!)
    main_category: text('main_category'), // 카테고리 (한식, 중식...)
    // address: text('address'),          // 주소 (나중에 필요하면 주석 풀고 쓰세요)
    // image_url: text('image_url')       // 이미지 (나중에 필요하면 주석 풀고 쓰세요)
});