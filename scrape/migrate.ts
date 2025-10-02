import { db } from "./db/index";

async function addOpeningHoursColumn() {
  try {
    console.log("Adding opening_hours column to poi table...");
    
    // Add the opening_hours column to the existing poi table
    await db.execute(`
      ALTER TABLE poi 
      ADD COLUMN IF NOT EXISTS opening_hours TEXT;
    `);
    
    console.log("Successfully added opening_hours column to poi table");
  } catch (error) {
    console.error("Error adding opening_hours column:", error);
  }
}

// Run the migration
addOpeningHoursColumn().then(() => {
  console.log("Migration completed");
  process.exit(0);
}).catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});