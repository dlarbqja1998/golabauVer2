-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "keyword_reviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"restaurant_id" bigint NOT NULL,
	"keyword" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"distance" bigint,
	"id" bigint PRIMARY KEY NOT NULL,
	"phone" text,
	"place_name" text,
	"place_url" text,
	"road_address_name" text,
	"x" double precision,
	"y" double precision,
	"main_category" text,
	"distance_in_meters" integer,
	"walk_time_in_minutes" integer,
	"path_coordinates" json,
	"rating" real DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_id" bigint NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ratings_rating_check" CHECK ((rating >= 1) AND (rating <= 5))
);
--> statement-breakpoint
ALTER TABLE "keyword_reviews" ADD CONSTRAINT "fk_restaurant" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;
*/