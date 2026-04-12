import {
    pgTable,
    foreignKey,
    bigserial,
    bigint,
    varchar,
    timestamp,
    text,
    doublePrecision,
    integer,
    json,
    real,
    check,
    serial,
    boolean,
    uniqueIndex
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("user", {
    id: serial("id").primaryKey(),
    email: text("email").unique().notNull(),
    password: text("password"),
    nickname: varchar("nickname", { length: 10 }).notNull(),
    badge: text("badge").default('CrimsonJunior'),
    profileImg: text("profile_img"),
    points: integer("points").default(0),
    provider: text("provider").default('local'),
    providerId: text("provider_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    college: text("college"),
    department: text("department"),
    grade: text("grade"),
    birthYear: integer("birth_year"),
    gender: text("gender"),
    isOnboarded: boolean("is_onboarded").default(false),
    role: text("role").default('user'),
    isBanned: boolean("is_banned").default(false),
    trustScore: real("trust_score").default(36.5),
    reportCount: integer("report_count").default(0),
    status: text("status").default('ACTIVE'),
    kakaoId: text("kakao_id"),
    instaId: text("insta_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true, mode: 'string' }),
    deletionReason: text("deletion_reason"),
});

export const golabassyuPosts = pgTable("golabassyu_posts", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: bigint("restaurant_id", { mode: "number" }),
    restaurantName: text("restaurant"),
    rating: integer("rating").default(0),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    area: text("area").default('전체'),
    likes: integer("likes").default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const golabassyuComments = pgTable("golabassyu_comments", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => golabassyuPosts.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    content: text("content").notNull(),
    likes: integer("likes").default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const postLikes = pgTable("post_likes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    postId: integer("post_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const commentLikes = pgTable("comment_likes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    commentId: integer("comment_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

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
    zone: text("zone").default('기타'),
});

export const ratings = pgTable("ratings", {
    id: serial("id").primaryKey().notNull(),
    restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
    userId: integer("user_id").notNull(),
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, () => [
    check("ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

export const keywordReviews = pgTable("keyword_reviews", {
    id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
    restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
    userId: integer("user_id").notNull(),
    keyword: varchar("keyword", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
    foreignKey({
        columns: [table.restaurantId],
        foreignColumns: [restaurants.id],
        name: "fk_restaurant"
    }).onDelete("cascade"),
]);

export const userLogs = pgTable("user_logs", {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    sessionId: text("session_id"),
    actionType: text("action_type").notNull(),
    target: text("target"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const rooms = pgTable("rooms", {
    id: serial("id").primaryKey(),
    creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text("title").notNull(),
    appointmentTime: timestamp("appointment_time", { withTimezone: true, mode: 'string' }).notNull(),
    restaurantId: bigint("restaurant_id", { mode: "number" }).references(() => restaurants.id, { onDelete: 'set null' }),
    restaurantName: text("restaurant_name").notNull(),
    meetingType: text("meeting_type").notNull(),
    genderCondition: text("gender_condition").notNull(),
    headcountCondition: text("headcount_condition"),
    contactType: text("contact_type").notNull(),
    contactId: text("contact_id").notNull(),
    bumpedAt: timestamp("bumped_at", { withTimezone: true, mode: 'string' }).defaultNow(),
    status: text("status").default('OPEN'),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const roomParticipants = pgTable("room_participants", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull().references(() => rooms.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text("role").notNull(),
    isReady: boolean("is_ready").default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const pointLogs = pgTable("point_logs", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const roomRequests = pgTable("room_requests", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull(),
    requesterId: integer("requester_id").notNull(),
    status: text("status").default('PENDING'),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    uniqueIndex("room_requests_room_id_unique").on(table.roomId),
]);
