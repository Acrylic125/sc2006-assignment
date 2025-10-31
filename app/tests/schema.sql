CREATE TABLE "test_itinerary_poi" (
    "id" serial PRIMARY KEY NOT NULL,
    "itinerary_id" integer NOT NULL,
    "poi_id" integer NOT NULL,
    "order_priority" integer NOT NULL,
    "checked" boolean DEFAULT false NOT NULL,
    CONSTRAINT "idx_itinerary_poi_test" UNIQUE("itinerary_id", "poi_id")
);
--> statement-breakpoint
CREATE TABLE "test_itinerary" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(128) NOT NULL,
    "userId" varchar(128) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_poi_images" (
    "id" serial PRIMARY KEY NOT NULL,
    "poi_id" integer NOT NULL,
    "imageUrl" varchar(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "uploader_id" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "test_poi" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(128) NOT NULL,
    "description" text NOT NULL,
    "latitude" numeric NOT NULL,
    "longitude" numeric NOT NULL,
    "address" text DEFAULT '',
    "opening_hours" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "uploader_id" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "test_poi_tag" (
    "id" serial PRIMARY KEY NOT NULL,
    "poi_id" integer NOT NULL,
    "tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_review_images" (
    "id" serial PRIMARY KEY NOT NULL,
    "review_id" integer NOT NULL,
    "imageUrl" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_review" (
    "id" serial PRIMARY KEY NOT NULL,
    "poi_id" integer NOT NULL,
    "userId" varchar(128) NOT NULL,
    "liked" boolean NOT NULL,
    "comment" text,
    CONSTRAINT "idx_user_poi_test" UNIQUE("userId", "poi_id")
);
--> statement-breakpoint
CREATE TABLE "test_tag" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(128) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_user_surprise_me_preferences" (
    "id" serial PRIMARY KEY NOT NULL,
    "userId" varchar(128) NOT NULL,
    "poi_id" integer NOT NULL,
    "liked" boolean NOT NULL,
    CONSTRAINT "idx_user_poi_test_test" UNIQUE("userId", "poi_id")
);
--> statement-breakpoint
ALTER TABLE "test_itinerary_poi"
ADD CONSTRAINT "test_itinerary_poi_itinerary_id_test_itinerary_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."test_itinerary"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_itinerary_poi"
ADD CONSTRAINT "test_itinerary_poi_poi_id_test_poi_id_fk" FOREIGN KEY ("poi_id") REFERENCES "public"."test_poi"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_poi_images"
ADD CONSTRAINT "test_poi_images_poi_id_test_poi_id_fk" FOREIGN KEY ("poi_id") REFERENCES "public"."test_poi"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_poi_tag"
ADD CONSTRAINT "test_poi_tag_poi_id_test_poi_id_fk" FOREIGN KEY ("poi_id") REFERENCES "public"."test_poi"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_poi_tag"
ADD CONSTRAINT "test_poi_tag_tag_id_test_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."test_tag"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_review_images"
ADD CONSTRAINT "test_review_images_review_id_test_review_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."test_review"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_review"
ADD CONSTRAINT "test_review_poi_id_test_poi_id_fk" FOREIGN KEY ("poi_id") REFERENCES "public"."test_poi"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "test_user_surprise_me_preferences"
ADD CONSTRAINT "test_user_surprise_me_preferences_poi_id_test_poi_id_fk" FOREIGN KEY ("poi_id") REFERENCES "public"."test_poi"("id") ON DELETE no action ON UPDATE no action;