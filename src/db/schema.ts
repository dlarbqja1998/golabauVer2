import { pgTable, foreignKey, bigserial, bigint, varchar, timestamp, text, doublePrecision, integer, json, real, check, serial, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// =========================================================
//  1. 유저 (사용자 분석의 핵심)
// =========================================================
export const users = pgTable("user", {
    id: serial("id").primaryKey(),
    email: text("email").unique().notNull(),
    password: text("password"),
    nickname: varchar("nickname", {length:10}).notNull(),
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
    isOnboarded: boolean("is_onboarded").default(false), // 추가 정보 입력 했니? (기본값 false)

    // ▼▼▼ 관리자 및 제재용 컬럼 ▼▼▼
    role: text("role").default('user'),           // 'user' 또는 'admin'
    isBanned: boolean("is_banned").default(false), // 악성 유저 밴 처리용

    // ▼▼▼ [업데이트: 만나볼텨? 기능 추가 컬럼] ▼▼▼
    trustScore: real("trust_score").default(36.5), // 매너 온도 (기본값 36.5도)
    reportCount: integer("report_count").default(0), // 신고 누적 횟수 (3회 시 정지)
    status: text("status").default('ACTIVE'), // 계정 상태 ('ACTIVE', 'SUSPENDED')
    kakaoId: text("kakao_id"), // 연락처 자동완성용 카톡 ID
    instaId: text("insta_id"), // 연락처 자동완성용 인스타 ID
});

// =========================================================
//  2. 골라바쓔 커뮤니티 (게시글 & 댓글)
// =========================================================

// 게시글 테이블
export const golabassyuPosts = pgTable("golabassyu_posts", {
    id: serial("id").primaryKey(),
    // 누가 썼는지 기록 (데이터 분석용)
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    restaurantId: bigint("restaurant_id", { mode: "number" }),
    restaurantName: text("restaurant"), // 식당 이름
    rating: integer("rating").default(0), // 별점
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    area: text("area").default('전체'),
    likes: integer("likes").default(0),
    
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 댓글 테이블
export const golabassyuComments = pgTable("golabassyu_comments", {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => golabassyuPosts.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // 작성자 연결
    content: text("content").notNull(),
    // ▼▼▼ [추가됨] 댓글 좋아요 개수 기록 컬럼 ▼▼▼
    likes: integer("likes").default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 게시글 좋아요 기록
export const postLikes = pgTable("post_likes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    postId: integer("post_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ▼▼▼ [추가됨] 댓글 좋아요 기록 테이블 ▼▼▼
export const commentLikes = pgTable("comment_likes", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    commentId: integer("comment_id").notNull(),
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
    zone: text("zone").default('기타'),
});

// ▼▼▼ [수정됨] userId 추가 ▼▼▼
export const ratings = pgTable("ratings", {
    id: serial("id").primaryKey().notNull(),
    restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
    userId: integer("user_id").notNull(), // ★ 누가 별점 줬는지 기록
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
    check("ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);

// ▼▼▼ [수정됨] userId 추가 ▼▼▼
export const keywordReviews = pgTable("keyword_reviews", {
    id: bigserial("id", { mode: "bigint" }).primaryKey().notNull(),
    restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
    userId: integer("user_id").notNull(), // ★ 누가 키워드 눌렀는지 기록
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
    metadata: json("metadata"),

    // 4. 언제?
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// =========================================================
//  4. '만나볼텨?' 소셜 매칭 데이터베이스
// =========================================================

// 4-1. 방 정보 테이블
export const rooms = pgTable("rooms", {
    id: serial("id").primaryKey(),
    creatorId: integer("creator_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // 방장 ID
    title: text("title").notNull(), // 방 제목
    appointmentTime: timestamp("appointment_time", { withTimezone: true, mode: 'string' }).notNull(), // 약속 날짜 및 시간
    
    // 식당 정보 (골라바유 DB 연동)
    restaurantId: bigint("restaurant_id", { mode: "number" }).references(() => restaurants.id, { onDelete: 'set null' }), 
    restaurantName: text("restaurant_name").notNull(), // 조인 없이 빠른 렌더링을 위한 식당 이름
    
    // 매칭 조건
    meetingType: text("meeting_type").notNull(), // 'BABYAK'(밥약), 'GWATING'(과팅)
    genderCondition: text("gender_condition").notNull(), // 'ALL'(전체), 'MALE'(남자), 'FEMALE'(여자)
    headcountCondition: text("headcount_condition"), // 인원 비율 (예: '2:2', '3:3' - 과팅일 경우)

    // 연락처 정보 (비용 제로 매칭용)
    contactType: text("contact_type").notNull(), // 'KAKAO', 'INSTA'
    contactId: text("contact_id").notNull(), // 연락받을 ID

    // 시스템 및 정렬
    bumpedAt: timestamp("bumped_at", { withTimezone: true, mode: 'string' }).defaultNow(), // 상점 아이템(끌올) 적용 시점
    status: text("status").default('OPEN'), // 'OPEN'(모집중), 'MATCHED'(성사됨), 'CANCELED'(취소됨)
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 4-2. 방 참여자 및 레디 상태 테이블 (메이플 교환창 컨셉)
export const roomParticipants = pgTable("room_participants", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull().references(() => rooms.id, { onDelete: 'cascade' }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text("role").notNull(), // 'HOST'(방장), 'APPLICANT'(신청자)
    isReady: boolean("is_ready").default(false), // 레디 버튼 클릭 여부
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// =========================================================
//  5. 포인트 및 PWA 푸시 알림 인프라
// =========================================================

// 5-1. 포인트 획득/사용 내역 (선순환 구조 및 상점)
export const pointLogs = pgTable("point_logs", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    amount: integer("amount").notNull(), // 변동 포인트 (획득은 양수, 사용/차감은 음수)
    reason: text("reason").notNull(), // 내역 사유 (예: '리뷰 작성', '끌올권 구매', '어뷰징 차감')
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 5-2. PWA 푸시 알림 구독 정보 (기기별 알림 발송용)
export const pushSubscriptions = pgTable("push_subscriptions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text("endpoint").notNull(), // 브라우저 푸시 서비스 URL
    p256dh: text("p256dh").notNull(), // 암호화 키
    auth: text("auth").notNull(), // 인증 키
    userAgent: text("user_agent"), // 어떤 기기/브라우저인지 식별용 (선택)
    createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 5-3 누가 신청했는지 기록할 디비 업데이트
export const roomRequests = pgTable("room_requests", {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").notNull(),           // 어느 방에 신청했는지
    requesterId: integer("requester_id").notNull(), // 신청한 사람의 유저 ID
    status: text("status").default('PENDING'),      // 상태 (PENDING: 대기중, ACCEPTED: 수락됨, REJECTED: 거절됨)
    createdAt: timestamp("created_at").defaultNow(),
});