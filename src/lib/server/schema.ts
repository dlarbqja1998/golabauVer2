import { pgTable, serial, text, integer, timestamp, real, jsonb } from 'drizzle-orm/pg-core';

// 1. 유저 테이블 (SQL과 동일)
export const user = pgTable('user', {
    id: serial('id').primaryKey(),
    email: text('email').unique().notNull(),
    password: text('password'),
    nickname: text('nickname').notNull(),
    badge: text('badge').default('신입생'),
    profileImg: text('profile_img'),
    points: integer('points').default(0),
    provider: text('provider').default('local'),
    providerId: text('provider_id'),
    createdAt: timestamp('created_at').defaultNow()
});

// 2. 맛집 테이블 (기존 테이블 매핑)
export const restaurants = pgTable('restaurants', {
    id: serial('id').primaryKey(),
    name: text('place_name').notNull(),
    mainCategory: text('main_category'),
    averageRating: real('average_rating').default(0.0),
    reviewCount: integer('review_count').default(0),
    distance: integer('distance_in_meters'),
    walkTime: integer('walk_time_in_minutes'),
    pathCoordinates: jsonb('path_coordinates')
});

// 3. 키워드 리뷰 테이블
export const keywordReviews = pgTable('keyword_reviews', {
    id: serial('id').primaryKey(),
    restaurantId: integer('restaurant_id').references(() => restaurants.id, { onDelete: 'cascade' }).notNull(),
    keyword: text('keyword').notNull(),
    count: integer('count').default(1)
});

// 4. 골라바쓔 게시글 테이블
export const golabassyuPosts = pgTable('golabassyu_posts', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    restaurant: text('restaurant').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    imageUrl: text('image_url'),
    area: text('area').default('전체'),
    likes: integer('likes').default(0),
    createdAt: timestamp('created_at').defaultNow()
});

// 5. 댓글 테이블
export const golabassyuComments = pgTable('golabassyu_comments', {
    id: serial('id').primaryKey(),
    postId: integer('post_id').references(() => golabassyuPosts.id, { onDelete: 'cascade' }).notNull(),
    userId: integer('user_id').references(() => user.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow()
});