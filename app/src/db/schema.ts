import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  customType,
  boolean,
  text,
  numeric,
  timestamp,
  uuid,
  serial,
  integer,
  uniqueIndex,
  unique,
} from "drizzle-orm/pg-core";

// Ignore this. It is used for full-text search.
export const tsvector = customType<{
  data: string;
}>({
  dataType() {
    return `tsvector`;
  },
});

// Tags are used for labelling POIs niches using the POI
// Tag Table. We will use this to generate scores for Surprise Me.
export const tagTable = pgTable("tag", {
  id: serial().notNull().primaryKey(),
  name: varchar({ length: 128 }).notNull(),
});

// Join table for the many-to-many relationship between poi and tag.
// Do not combine. We can do a join if we need to.
export const poiTagTable = pgTable("poi_tag", {
  id: serial().notNull().primaryKey(),
  poiId: integer("poi_id")
    .notNull()
    .references(() => poiTable.id),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tagTable.id),
});

export const poiTable = pgTable("poi", {
  id: serial().notNull().primaryKey(),
  name: varchar({ length: 128 }).notNull(),
  description: text("description").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Since this is Postgres, we split the images into a separate table.
// Do not combine. We can do a join if we need to.
export const poiImagesTable = pgTable("poi_images", {
  id: serial().notNull().primaryKey(),
  poiId: integer("poi_id")
    .notNull()
    .references(() => poiTable.id),
  // NOTE: This is a URL, not the image blob. Images need
  // to be stored in storage buckets.
  imageUrl: varchar({ length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const itineraryTable = pgTable("itinerary", {
  id: serial().notNull().primaryKey(),
  name: varchar({ length: 128 }).notNull(),
  // Clerk user id. We do not hold our own user table because clerk handles it for us.
  userId: varchar({ length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// This is the join table for the many-to-many relationship between itinerary and poi.
// Do not combine. We can do a join if we need to.
export const itineraryPOITable = pgTable("itinerary_poi", {
  id: serial().notNull().primaryKey(),
  itineraryId: integer("itinerary_id")
    .notNull()
    .references(() => itineraryTable.id),
  poiId: integer("poi_id")
    .notNull()
    .references(() => poiTable.id),
  // This is the order priority of the poi in the itinerary.
  // Show from lowest -> highest.
  orderPriority: integer("order_priority").notNull(),
});

export const reviewTable = pgTable(
  "review",
  {
    id: serial().notNull().primaryKey(),
    poiId: integer("poi_id")
      .notNull()
      .references(() => poiTable.id),
    // Clerk user id. We do not hold our own user table because clerk handles it for us.
    userId: varchar({ length: 128 }).notNull(),
    liked: boolean("liked").notNull(),
    comment: text("comment"),
  },
  // A user can only have one review for a poi.
  (t) => [unique("idx_user_poi").on(t.userId, t.poiId)]
);

export const reviewImagesTable = pgTable("review_images", {
  id: serial().notNull().primaryKey(),
  reviewId: integer("review_id")
    .notNull()
    .references(() => reviewTable.id),
  // NOTE: This is a URL, not the image blob. Images need
  // to be stored in storage buckets.
  imageUrl: varchar({ length: 255 }).notNull(),
});

// Join table for the many-to-many relationship between user and tag.
// Do not combine. We can do a join if we need to.
export const userSurpriseMePreferencesTable = pgTable(
  "user_surprise_me_preferences",
  {
    id: serial().notNull().primaryKey(),
    userId: varchar({ length: 128 }).notNull(),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tagTable.id),
  }
);
