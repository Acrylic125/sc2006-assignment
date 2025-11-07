import { db } from "./db/index";
import { sql } from "drizzle-orm";

async function enableRLS() {
  console.log("🔐 Enabling Row Level Security for all tables...");
  
  // List of all table names that need RLS enabled
  const tableNames = [
    "poi",
    "poi_tag", 
    "poi_images",
    "itinerary",
    "itinerary_poi",
    "review",
    "review_images",
    "user_surprise_me_preferences",
    "tag"
  ];
  
  try {
    for (const tableName of tableNames) {
      console.log(`📋 Enabling RLS for table: ${tableName}`);
      
      await db.execute(sql`ALTER TABLE ${sql.identifier(tableName)} ENABLE ROW LEVEL SECURITY`);
      
      console.log(`✅ RLS enabled for table: ${tableName}`);
    }
    
    console.log("\n🎉 Row Level Security enabled for all tables successfully!");
    
  } catch (error) {
    console.error("❌ Error enabling RLS:", error);
    throw error;
  }
}

enableRLS().then(() => {
  console.log("✅ RLS enablement completed");
  process.exit(0);
}).catch((error) => {
  console.error("❌ RLS enablement failed:", error);
  process.exit(1);
});