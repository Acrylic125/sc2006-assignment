import { db } from "./db/index";

async function verifyDataInsertion() {
  try {
    console.log("Verifying data insertion...");
    
    // Check total POI count
    const poiCount = await db.execute("SELECT COUNT(*) as count FROM poi");
    console.log(`Total POIs in database: ${(poiCount as any)[0].count}`);
    
    // Check total image count
    const imageCount = await db.execute("SELECT COUNT(*) as count FROM poi_images");
    console.log(`Total POI images in database: ${(imageCount as any)[0].count}`);
    
    // Show some examples of tourist attractions with opening hours
    console.log("\n--- Tourist Attractions with Opening Hours ---");
    const touristPois = await db.execute(`
      SELECT name, description, latitude, longitude, opening_hours 
      FROM poi 
      WHERE opening_hours IS NOT NULL 
      LIMIT 5
    `);
    
    (touristPois as any).forEach((poi: any, index: number) => {
      console.log(`${index + 1}. ${poi.name}`);
      console.log(`   Location: ${poi.latitude}, ${poi.longitude}`);
      console.log(`   Description: ${poi.description.substring(0, 100)}...`);
      console.log(`   Opening Hours: ${poi.opening_hours}`);
      console.log();
    });
    
    // Show some examples of parks
    console.log("--- Parks ---");
    const parks = await db.execute(`
      SELECT name, description, latitude, longitude 
      FROM poi 
      WHERE opening_hours IS NULL 
      AND description LIKE '%park%'
      LIMIT 5
    `);
    
    (parks as any).forEach((poi: any, index: number) => {
      console.log(`${index + 1}. ${poi.name}`);
      console.log(`   Location: ${poi.latitude}, ${poi.longitude}`);
      console.log(`   Description: ${poi.description}`);
      console.log();
    });
    
    // Show some examples of POIs with images
    console.log("--- POIs with Images ---");
    const poisWithImages = await db.execute(`
      SELECT p.name, p.description, pi."imageUrl" 
      FROM poi p
      JOIN poi_images pi ON p.id = pi.poi_id
      LIMIT 5
    `);
    
    (poisWithImages as any).forEach((poi: any, index: number) => {
      console.log(`${index + 1}. ${poi.name}`);
      console.log(`   Description: ${poi.description.substring(0, 100)}...`);
      console.log(`   Image URL: ${poi.imageUrl}`);
      console.log();
    });
    
  } catch (error) {
    console.error("Error verifying data:", error);
  }
}

// Run the verification
verifyDataInsertion().then(() => {
  console.log("Verification completed");
  process.exit(0);
}).catch((error) => {
  console.error("Verification failed:", error);
  process.exit(1);
});