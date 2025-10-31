-- Disable foreign key checks temporarily if your database system supports it
-- (e.g., SET session_replication_role = 'replica'; in PostgreSQL for a session)
-- This is generally not needed if you drop constraints explicitly.
-- Drop all foreign key constraints first
ALTER TABLE "test_itinerary_poi" DROP CONSTRAINT IF EXISTS "test_itinerary_poi_itinerary_id_test_itinerary_id_fk";
ALTER TABLE "test_itinerary_poi" DROP CONSTRAINT IF EXISTS "test_itinerary_poi_poi_id_test_poi_id_fk";
ALTER TABLE "test_poi_images" DROP CONSTRAINT IF EXISTS "test_poi_images_poi_id_test_poi_id_fk";
ALTER TABLE "test_poi_tag" DROP CONSTRAINT IF EXISTS "test_poi_tag_poi_id_test_poi_id_fk";
ALTER TABLE "test_poi_tag" DROP CONSTRAINT IF EXISTS "test_poi_tag_tag_id_test_tag_id_fk";
ALTER TABLE "test_review_images" DROP CONSTRAINT IF EXISTS "test_review_images_review_id_test_review_id_fk";
ALTER TABLE "test_review" DROP CONSTRAINT IF EXISTS "test_review_poi_id_test_poi_id_fk";
ALTER TABLE "test_user_surprise_me_preferences" DROP CONSTRAINT IF EXISTS "test_user_surprise_me_preferences_poi_id_test_poi_id_fk";
-- Drop unique constraints
ALTER TABLE "test_itinerary_poi" DROP CONSTRAINT IF EXISTS "idx_itinerary_poi_test";
ALTER TABLE "test_review" DROP CONSTRAINT IF EXISTS "idx_user_poi_test";
ALTER TABLE "test_user_surprise_me_preferences" DROP CONSTRAINT IF EXISTS "idx_user_poi_test_test";
-- Drop tables in an order that respects remaining dependencies (if any, though
-- dropping FKs first makes this less critical)
-- It's often safer to drop tables that are *referenced by* other tables first.
-- In this case, `test_itinerary`, `test_poi`, and `test_tag` are referenced.
-- The others reference these.
DROP TABLE IF EXISTS "test_itinerary_poi";
DROP TABLE IF EXISTS "test_poi_images";
DROP TABLE IF EXISTS "test_poi_tag";
DROP TABLE IF EXISTS "test_review_images";
DROP TABLE IF EXISTS "test_review";
DROP TABLE IF EXISTS "test_user_surprise_me_preferences";
DROP TABLE IF EXISTS "test_itinerary";
DROP TABLE IF EXISTS "test_poi";
DROP TABLE IF EXISTS "test_tag";
-- Re-enable foreign key checks if you disabled them earlier
-- (e.g., SET session_replication_role = 'origin'; in PostgreSQL)