import { db } from "./db/index";

async function checkTableStructure() {
  try {
    console.log("Checking table structure...");
    
    // Check poi table columns
    const poiColumns = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'poi' 
      ORDER BY ordinal_position
    `);
    
    console.log("POI table columns:");
    (poiColumns as any).forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Check poi_images table columns
    const imageColumns = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'poi_images' 
      ORDER BY ordinal_position
    `);
    
    console.log("\nPOI_IMAGES table columns:");
    (imageColumns as any).forEach((col: any) => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if we have any images
    const imageCount = await db.execute("SELECT COUNT(*) as count FROM poi_images");
    console.log(`\nTotal images: ${(imageCount as any)[0].count}`);
    
    // Show first few rows if any
    if ((imageCount as any)[0].count > 0) {
      const sampleImages = await db.execute("SELECT * FROM poi_images LIMIT 3");
      console.log("\nSample image records:");
      (sampleImages as any).forEach((img: any, index: number) => {
        console.log(`${index + 1}. ID: ${img.id}, POI_ID: ${img.poi_id}, URL: ${img.imageurl || img.image_url}`);
      });
    }
    
  } catch (error) {
    console.error("Error checking structure:", error);
  }
}

// Run the check
checkTableStructure().then(() => {
  console.log("Structure check completed");
  process.exit(0);
}).catch((error) => {
  console.error("Structure check failed:", error);
  process.exit(1);
});