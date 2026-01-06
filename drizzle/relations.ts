import { relations } from "drizzle-orm/relations";
import { restaurants, keywordReviews } from "./schema";

export const keywordReviewsRelations = relations(keywordReviews, ({one}) => ({
	restaurant: one(restaurants, {
		fields: [keywordReviews.restaurantId],
		references: [restaurants.id]
	}),
}));

export const restaurantsRelations = relations(restaurants, ({many}) => ({
	keywordReviews: many(keywordReviews),
}));