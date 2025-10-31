import { db } from "./db/index";
import { poiTable, poiTagTable, poiImagesTable, itineraryPOITable, reviewTable, reviewImagesTable, userSurpriseMePreferencesTable } from "./db/schema";
import { eq } from "drizzle-orm";

const poi_ids = [37, 81, 39, 88];

async function safeDeletePOIs() {
    console.log("🔍 Starting safe POI deletion process...");
    
    for (const id of poi_ids) {
        try {
            console.log(`\n📋 Processing POI ${id}...`);
            
            // First, check if the POI exists
            const existingPOI = await db.select()
                .from(poiTable)
                .where(eq(poiTable.id, id))
                .limit(1);
            
            if (existingPOI.length === 0) {
                console.log(`⚠️  POI ${id} does not exist, skipping...`);
                continue;
            }
            
            console.log(`✅ Found POI ${id}: "${existingPOI[0].name}"`);
            
            // Check for related records before deletion
            const relatedChecks = await Promise.all([
                db.select().from(poiTagTable).where(eq(poiTagTable.poiId, id)),
                db.select().from(poiImagesTable).where(eq(poiImagesTable.poiId, id)),
                db.select().from(itineraryPOITable).where(eq(itineraryPOITable.poiId, id)),
                db.select().from(reviewTable).where(eq(reviewTable.poiId, id)),
                db.select().from(userSurpriseMePreferencesTable).where(eq(userSurpriseMePreferencesTable.poiId, id))
            ]);
            
            const [tags, images, itineraryEntries, reviews, preferences] = relatedChecks;
            
            console.log(`   📊 Related records found:`);
            console.log(`      - Tags: ${tags.length}`);
            console.log(`      - Images: ${images.length}`);
            console.log(`      - Itinerary entries: ${itineraryEntries.length}`);
            console.log(`      - Reviews: ${reviews.length}`);
            console.log(`      - User preferences: ${preferences.length}`);
            
            // Delete related records first (to avoid foreign key constraint errors)
            
            // 1. Delete review images (depends on reviews)
            for (const review of reviews) {
                const reviewImages = await db.delete(reviewImagesTable)
                    .where(eq(reviewImagesTable.reviewId, review.id))
                    .returning();
                if (reviewImages.length > 0) {
                    console.log(`   🗑️  Deleted ${reviewImages.length} review images for review ${review.id}`);
                }
            }
            
            // 2. Delete reviews
            if (reviews.length > 0) {
                const deletedReviews = await db.delete(reviewTable)
                    .where(eq(reviewTable.poiId, id))
                    .returning();
                console.log(`   🗑️  Deleted ${deletedReviews.length} reviews`);
            }
            
            // 3. Delete itinerary entries
            if (itineraryEntries.length > 0) {
                const deletedItineraryEntries = await db.delete(itineraryPOITable)
                    .where(eq(itineraryPOITable.poiId, id))
                    .returning();
                console.log(`   🗑️  Deleted ${deletedItineraryEntries.length} itinerary entries`);
            }
            
            // 4. Delete user preferences
            if (preferences.length > 0) {
                const deletedPreferences = await db.delete(userSurpriseMePreferencesTable)
                    .where(eq(userSurpriseMePreferencesTable.poiId, id))
                    .returning();
                console.log(`   🗑️  Deleted ${deletedPreferences.length} user preferences`);
            }
            
            // 5. Delete POI tags
            if (tags.length > 0) {
                const deletedTags = await db.delete(poiTagTable)
                    .where(eq(poiTagTable.poiId, id))
                    .returning();
                console.log(`   🗑️  Deleted ${deletedTags.length} POI-tag relationships`);
            }
            
            // 6. Delete POI images
            if (images.length > 0) {
                const deletedImages = await db.delete(poiImagesTable)
                    .where(eq(poiImagesTable.poiId, id))
                    .returning();
                console.log(`   🗑️  Deleted ${deletedImages.length} POI images`);
            }
            
            // Finally, delete the POI itself
            const deletedPOI = await db.delete(poiTable)
                .where(eq(poiTable.id, id))
                .returning();
            
            if (deletedPOI.length > 0) {
                console.log(`   ✅ Successfully deleted POI ${id}: "${deletedPOI[0].name}"`);
            } else {
                console.log(`   ❌ Failed to delete POI ${id}`);
            }
            
        } catch (error) {
            console.error(`   ❌ Error deleting POI ${id}:`, error);
            // Continue with next POI instead of stopping entirely
        }
    }
}

// Add confirmation prompt
async function confirmDeletion() {
    console.log("⚠️  WARNING: You are about to permanently delete the following POIs:");
    
    for (const id of poi_ids) {
        const poi = await db.select()
            .from(poiTable)
            .where(eq(poiTable.id, id))
            .limit(1);
        
        if (poi.length > 0) {
            console.log(`   - POI ${id}: "${poi[0].name}"`);
        }
    }
    
    console.log("\n🔴 This action cannot be undone!");
    console.log("💡 To proceed with deletion, uncomment the safeDeletePOIs() call below");
    
    // Uncomment the line below when you're ready to actually delete
    //await safeDeletePOIs();
}

confirmDeletion().then(() => {
    console.log("\n✅ POI deletion process completed");
    process.exit(0);
}).catch((error) => {
    console.error("\n❌ POI deletion failed:", error);
    process.exit(1);
});