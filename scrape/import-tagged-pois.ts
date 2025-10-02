import { db } from "./db/index";
import { poiTagTable, tagTable } from "./db/schema";
import * as fs from "fs";
import { eq } from "drizzle-orm";

interface CSVRow {
  poi_id: number;
  poi_name: string;
  poi_description: string;
  suggested_tags: string;
}

async function importTaggedPOIs() {
  try {
    console.log("Importing tagged POIs from CSV...");
    
    // Read the CSV file
    const csvContent = fs.readFileSync('poi_for_tagging.csv', 'utf8');
    const lines = csvContent.split('\n');
    
    // Skip header and filter out empty lines
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    // Get all available tags for mapping
    const tags = await db.select({
      id: tagTable.id,
      name: tagTable.name,
    }).from(tagTable);
    
    const tagNameToId = new Map(tags.map(tag => [tag.name.toLowerCase(), tag.id]));
    
    console.log(`Processing ${dataLines.length} POI entries...`);
    
    const poiTagInserts = [];
    let processedCount = 0;
    let errorCount = 0;
    
    for (const line of dataLines) {
      try {
        // Parse CSV line (simple parsing, assumes proper CSV format)
        const matches = line.match(/^(\d+),"([^"]*?)","([^"]*?)","([^"]*?)"$/);
        if (!matches) {
          console.warn(`Skipping invalid line: ${line.substring(0, 50)}...`);
          errorCount++;
          continue;
        }
        
        const [, poiIdStr, poiName, poiDescription, suggestedTags] = matches;
        const poiId = parseInt(poiIdStr);
        
        // Skip if no tags suggested
        if (!suggestedTags.trim()) {
          console.log(`No tags for POI ${poiId}: ${poiName}`);
          processedCount++;
          continue;
        }
        
        // Parse suggested tags
        const tagNames = suggestedTags.split(',').map(tag => tag.trim().toLowerCase());
        
        for (const tagName of tagNames) {
          if (tagName) {
            const tagId = tagNameToId.get(tagName);
            if (tagId) {
              poiTagInserts.push({
                poiId: poiId,
                tagId: tagId,
              });
            } else {
              console.warn(`Unknown tag: "${tagName}" for POI ${poiId}: ${poiName}`);
            }
          }
        }
        
        processedCount++;
        
        if (processedCount % 50 === 0) {
          console.log(`Processed ${processedCount} POIs...`);
        }
        
      } catch (error) {
        console.error(`Error processing line: ${line.substring(0, 50)}...`, error);
        errorCount++;
      }
    }
    
    // Insert all POI-tag relationships
    if (poiTagInserts.length > 0) {
      console.log(`\nInserting ${poiTagInserts.length} POI-tag relationships...`);
      
      // Insert in batches to avoid overwhelming the database
      const batchSize = 100;
      let insertedCount = 0;
      
      for (let i = 0; i < poiTagInserts.length; i += batchSize) {
        const batch = poiTagInserts.slice(i, i + batchSize);
        
        try {
          // Insert with ON CONFLICT DO NOTHING to avoid duplicates
          const result = await db.insert(poiTagTable)
            .values(batch)
            .onConflictDoNothing()
            .returning({ id: poiTagTable.id });
          
          insertedCount += result.length;
          console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(poiTagInserts.length / batchSize)} (${result.length} new entries)`);
        } catch (error) {
          console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        }
      }
      
      console.log(`\n✅ Successfully inserted ${insertedCount} new POI-tag relationships (${poiTagInserts.length - insertedCount} duplicates skipped)`);
    } else {
      console.log("No POI-tag relationships to insert");
    }
    
    console.log(`\nSummary:`);
    console.log(`- Processed: ${processedCount} POIs`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Tag relationships created: ${poiTagInserts.length}`);
    
    // Show some statistics
    const tagStats = new Map();
    for (const insert of poiTagInserts) {
      const tagName = tags.find(t => t.id === insert.tagId)?.name || 'Unknown';
      tagStats.set(tagName, (tagStats.get(tagName) || 0) + 1);
    }
    
    console.log(`\nTag usage statistics:`);
    for (const [tagName, count] of Array.from(tagStats.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tagName}: ${count} POIs`);
    }
    
  } catch (error) {
    console.error("Error importing tagged POIs:", error);
  }
}

// Run the import
importTaggedPOIs().then(() => {
  console.log("POI tag import completed");
  process.exit(0);
}).catch((error) => {
  console.error("POI tag import failed:", error);
  process.exit(1);
});