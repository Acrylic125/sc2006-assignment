import { db } from "./db/index";
import { tagTable, poiTable, poiImagesTable } from "./db/schema";
import * as fs from "fs";

// Utility function to extract value from HTML table description
function extractValueFromDescription(description: string, fieldName: string): string | null {
  const regex = new RegExp(`<th>${fieldName}<\\/th>\\s*<td>([^<]*)<\\/td>`, 'i');
  const match = description.match(regex);
  return match && match[1].trim() ? match[1].trim() : null;
}

// Function to fix image URLs (replace yoursingapore.com with visitsingapore.com)
function fixImageUrl(url: string): string {
  if (!url) return url;
  return url.replace(/yoursingapore\.com/g, 'visitsingapore.com');
}

// Function to process Tourist Attraction data
async function processTouristAttractions() {
  console.log("Processing Tourist Attractions data...");
  
  const data = JSON.parse(fs.readFileSync("./TouristAttractionData.json", "utf8"));
  const poisToInsert = [];
  const imagesToInsert = [];
  
  for (const feature of data.features) {
    const description = feature.properties.Description;
    
    if (!description) continue;
    
    // Extract data from HTML table
    const pageTitle = extractValueFromDescription(description, "PAGETITLE");
    const overview = extractValueFromDescription(description, "OVERVIEW");
    const latitude = extractValueFromDescription(description, "LATITUDE");
    const longitude = extractValueFromDescription(description, "LONGTITUDE");
    const imagePath = extractValueFromDescription(description, "IMAGE_PATH");
    const openingHours = extractValueFromDescription(description, "OPENING_HOURS");
    
    if (!pageTitle || !latitude || !longitude) continue;
    
    // Create POI object
    const poi = {
      name: pageTitle.substring(0, 128), // Truncate to fit varchar(128)
      description: overview || "No description available",
      latitude: latitude,
      longitude: longitude,
      openingHours: openingHours || null,
      uploader: "data.gov"
    };
    
    poisToInsert.push(poi);
    
    // If there's an image, prepare it for insertion
    if (imagePath) {
      const fixedImageUrl = fixImageUrl(imagePath);
      imagesToInsert.push({
        poiName: pageTitle, // We'll use this to match with inserted POI
        imageUrl: fixedImageUrl,
        uploader: "data.gov"
      });
    }
  }
  
  console.log(`Found ${poisToInsert.length} tourist attractions to insert`);
  return { poisToInsert, imagesToInsert };
}

// Function to process Parks data
async function processParks() {
  console.log("Processing Parks data...");
  
  const data = JSON.parse(fs.readFileSync("./Parks.geojson", "utf8"));
  const poisToInsert = [];
  
  for (const feature of data.features) {
    const properties = feature.properties;
    const geometry = feature.geometry;
    
    if (!properties.NAME || !geometry || !geometry.coordinates) continue;
    
    const poi = {
      name: properties.NAME.substring(0, 128), // Truncate to fit varchar(128)
      description: `A park in Singapore: ${properties.NAME}`,
      latitude: geometry.coordinates[1].toString(),
      longitude: geometry.coordinates[0].toString(),
      openingHours: null, // Parks data doesn't have opening hours
      uploader: "data.gov"
    };
    
    poisToInsert.push(poi);
  }
  
  console.log(`Found ${poisToInsert.length} parks to insert`);
  return { poisToInsert, imagesToInsert: [] };
}

// Function to insert POIs into database
async function insertPOIs() {
  try {
    // Process both datasets
    const touristData = await processTouristAttractions();
    const parksData = await processParks();
    
    // Combine all POIs
    const allPOIs = [...touristData.poisToInsert, ...parksData.poisToInsert];
    const allImages = [...touristData.imagesToInsert];
    
    console.log(`Inserting ${allPOIs.length} POIs into database...`);
    
    // Insert POIs and get the inserted records with IDs
    const insertedPOIs = await db.insert(poiTable).values(allPOIs).returning();
    
    console.log(`Successfully inserted ${insertedPOIs.length} POIs`);
    
    // Process images if any
    if (allImages.length > 0) {
      console.log(`Processing ${allImages.length} images...`);
      
      const imagesToInsertWithIds = [];
      
      // Match images with inserted POIs
      for (const image of allImages) {
        const matchedPOI = insertedPOIs.find(poi => poi.name === image.poiName);
        if (matchedPOI) {
          imagesToInsertWithIds.push({
            poiId: matchedPOI.id,
            imageUrl: image.imageUrl,
            uploader: "data.gov"
          });
        }
      }
      
      if (imagesToInsertWithIds.length > 0) {
        const insertedImages = await db.insert(poiImagesTable).values(imagesToInsertWithIds).returning();
        console.log(`Successfully inserted ${insertedImages.length} images`);
      }
    }
    
    console.log("Data processing completed successfully!");
    
  } catch (error) {
    console.error("Error inserting POIs:", error);
  }
}

// Run the data processing
insertPOIs().then(() => {
  console.log("POI insertion completed");
  process.exit(0);
}).catch((error) => {
  console.error("Failed to insert POIs:", error);
  process.exit(1);
});
