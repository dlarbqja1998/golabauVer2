import { pgTable, foreignKey, bigserial, bigint, varchar, timestamp, text, doublePrecision, integer, json, real, check, serial, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// =========================================================
//  1. 유저 (사용자 분석의 핵심)
// =========================================================
export const users = pgTable("user", {
    id: serial("id").primaryKey(),
    email: text("email").unique().notNull(),
    password: text("password"),
    nickname: text("nickname").notNull(),
    badge: text("badge").default('CrimsonJunior'),
    profileImg: text("profile_img"),
    points: integer("points").default(0),
    provider: text("provider").default('local'),
    providerId: text("provider_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),

    // ▼▼▼ 하이브리드 분석용 컬럼 ▼▼▼
    college: text("college"),        // 단과대학,
    department: text("department"), // 학과
    grade: text("grade"),            // 학년 (필수)
    birthYear: integer("birth_year"),    // 연령대(필수)
    gender: text("gender"),         // 성별(필수)
    isOnboarded: boolean("is_onboarded").default(false) // 추가 정보 입력 했니? (기본값 false)
});

// =========================================================
//  2. 골라바쓔 커뮤니티 (게시글 & 댓글)
// =========================================================

// 게시글 테이블
export const golabassyuPosts = pgTable("golabassyu_posts", {
    id: serial("id").primaryKey(),
    // 누가 썼는지 기록 (데이터 분석용)
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    
    restaurantName: text("restaurant"), // 식당 이름
    rating: integer("rating").default(0), // 별점
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    area: text("area").default('전체'),
    likes: integer("likes").default(0),
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 댓글 테이블 (보여주신 내용 반영 + 유저 연결)
export const golabassyuComments = pgTable("golabassyu_comments", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => golabassyuPosts.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // 작성자 연결
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 좋아요 기록 (중복 좋아요 방지 및 선호도 분석용)
export const postLikes = pgTable("post_likes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    postId: integer("post_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// =========================================================
//  3. 기존 맛집 데이터 (건드리지 않음)
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
// [DAE 핵심] 사용자 행동 로그 테이블 (CCTV 저장소)
export const userLogs = pgTable("user_logs", {
    id: serial("id").primaryKey(),
    
    // 1. 누가? (회원 + 비회원 모두 추적)
    userId: integer("user_id"),         // 로그인한 유저 ID (없으면 NULL)
    sessionId: text("session_id"),      // 비로그인 유저 추적용 (쿠키값)

    // 2. 무엇을?
    actionType: text("action_type").notNull(), // 'page_view', 'click', 'dwell_time' 등
    target: text("target"),             // '/my', '학식버튼', '전화하기' 등
    
    // 3. 디테일 (유연한 확장을 위해 JSON 사용)
    // 예: { "duration": 45, "device": "mobile", "scroll_depth": 80 }
    metadata: json("metadata"),

    // 4. 언제?
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});