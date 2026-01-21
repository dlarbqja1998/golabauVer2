import { pgTable, foreignKey, bigserial, bigint, varchar, timestamp, text, doublePrecision, integer, json, real, check, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// =========================================================
//  1. 기존 맛집 관련 테이블 (건드리지 않음)
// =========================================================

export const restaurants = pgTable("restaurants", {
	id: bigint("id", { mode: "number" }).primaryKey().notNull(),
	distance: bigint("distance", { mode: "number" }),
	phone: text("phone"),
	placeName: text("place_name"),
	placeUrl: text("place_url"),
	roadAddressName: text("road_address_name"),
	x: doublePrecision("x"),
	y: doublePrecision("y"),
	mainCategory: text("main_category"),
	distanceInMeters: integer("distance_in_meters"),
	walkTimeInMinutes: integer("walk_time_in_minutes"),
	pathCoordinates: json("path_coordinates"),
	rating: real("rating").default(0),
	reviewCount: integer("review_count").default(0),
	averageRating: real("average_rating").default(0),
});

// ★ [중요] ratings 테이블 (식당 점수표) - export 필수!
export const ratings = pgTable("ratings", {
	id: serial("id").primaryKey().notNull(),
	restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
	rating: integer("rating").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	check("ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const keywordReviews = pgTable("keyword_reviews", {
	id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
	restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
	keyword: varchar("keyword", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.restaurantId],
			foreignColumns: [restaurants.id],
			name: "fk_restaurant"
		}).onDelete("cascade"),
]);

// =========================================================
//  2. 골라바쓔 (커뮤니티) 테이블
// =========================================================

// 유저 테이블
export const users = pgTable("user", { // 테이블명 "user" 주의
	id: serial("id").primaryKey(),
	email: text("email").unique().notNull(),
	password: text("password"),
	nickname: text("nickname").notNull(),
	badge: text("badge").default('신입생'),
	profileImg: text("profile_img"),
	points: integer("points").default(0),
	provider: text("provider").default('local'),
	providerId: text("provider_id"),
	createdAt: timestamp("created_at").defaultNow(),
});

// 게시글 테이블 (변수명을 golabassyuPosts 로 통일!)
export const golabassyuPosts = pgTable("golabassyu_posts", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
	restaurantName: text("restaurant"),
    // 👇 별점 컬럼 추가됨
    rating: integer("rating").default(0), 
	title: text("title").notNull(),
	content: text("content").notNull(),
	imageUrl: text("image_url"),
	area: text("area").default('전체'),
	likes: integer("likes").default(0),
	createdAt: timestamp("created_at").defaultNow(),
});

// 댓글 테이블
export const comments = pgTable("golabassyu_comments", {
	id: serial("id").primaryKey(),
	postId: integer("post_id").notNull().references(() => golabassyuPosts.id, { onDelete: 'cascade' }),
	userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
	content: text("content").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

// [추가] 좋아요 장부 (누가 어떤 글을 좋아했는지 기록)
export const postLikes = pgTable("post_likes", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(), // 누가
	postId: integer("post_id").notNull(), // 어떤 글을
	createdAt: timestamp("created_at").defaultNow(),
});