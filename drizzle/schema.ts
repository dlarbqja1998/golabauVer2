import { pgTable, foreignKey, bigserial, bigint, varchar, timestamp, text, doublePrecision, integer, json, real, check, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const keywordReviews = pgTable("keyword_reviews", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
	keyword: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.restaurantId],
			foreignColumns: [restaurants.id],
			name: "fk_restaurant"
		}).onDelete("cascade"),
]);

export const restaurants = pgTable("restaurants", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	distance: bigint({ mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().notNull(),
	phone: text(),
	placeName: text("place_name"),
	placeUrl: text("place_url"),
	roadAddressName: text("road_address_name"),
	x: doublePrecision(),
	y: doublePrecision(),
	mainCategory: text("main_category"),
	distanceInMeters: integer("distance_in_meters"),
	walkTimeInMinutes: integer("walk_time_in_minutes"),
	pathCoordinates: json("path_coordinates"),
	rating: real().default(0),
});

export const ratings = pgTable("ratings", {
	id: serial().primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	restaurantId: bigint("restaurant_id", { mode: "number" }).notNull(),
	rating: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	check("ratings_rating_check", sql`(rating >= 1) AND (rating <= 5)`),
]);
