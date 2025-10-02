import { db } from "./db/index";
import { poiTable, tagTable } from "./db/schema";
import * as fs from "fs";
import { eq } from "drizzle-orm";

async function extractPOIsToCSV() {
  try {
    console.log("Extracting POI data to CSV...");
    
    // Get all POIs with their IDs and names
    const pois = await db.select({
      id: poiTable.id,
      name: poiTable.name,
      description: poiTable.description,
    }).from(poiTable).orderBy(poiTable.id);
    
    // Get all available tags for reference
    const tags = await db.select({
      id: tagTable.id,
      name: tagTable.name,
    }).from(tagTable).orderBy(tagTable.id);
    
    console.log(`Found ${pois.length} POIs to export`);
    console.log(`Available tags: ${tags.map(tag => tag.name).join(', ')}`);
    
    // Create CSV header
    // Format: poi_id,poi_name,poi_description,suggested_tags
    const csvHeader = 'poi_id,poi_name,poi_description,suggested_tags\n';
    
    // Create CSV rows
    const csvRows = pois.map(poi => {
      // Escape quotes and commas in the data
      const escapedName = `"${poi.name.replace(/"/g, '""')}"`;
      const escapedDescription = `"${poi.description.replace(/"/g, '""')}"`;
      
      // Leave suggested_tags empty for manual/LLM filling
      return `${poi.id},${escapedName},${escapedDescription},""`; 
    });
    
    // Combine header and rows
    const csvContent = csvHeader + csvRows.join('\n');
    
    // Write to CSV file
    const fileName = 'poi_for_tagging.csv';
    fs.writeFileSync(fileName, csvContent, 'utf8');
    
    console.log(`\n✅ Successfully exported ${pois.length} POIs to ${fileName}`);
    console.log(`\nAvailable tags for reference:`);
    tags.forEach(tag => {
      console.log(`  - ${tag.name} (ID: ${tag.id})`);
    });
    
    console.log(`\nNext steps:`);
    console.log(`1. Use LLM to fill the 'suggested_tags' column with comma-separated tag names`);
    console.log(`2. Create an import script to read the CSV and insert into poi_tag table`);
    console.log(`\nExample CSV format:`);
    console.log(`poi_id,poi_name,poi_description,suggested_tags`);
    console.log(`1,"National Gallery Singapore","Museum description...","Museum,Art,Culture"`);
    console.log(`2,"Labrador Nature Reserve","Park description...","Park,Nature"`);
    
  } catch (error) {
    console.error("Error extracting POIs:", error);
  }
}

// Run the extraction
extractPOIsToCSV().then(() => {
  console.log("POI extraction completed");
  process.exit(0);
}).catch((error) => {
  console.error("POI extraction failed:", error);
  process.exit(1);
});