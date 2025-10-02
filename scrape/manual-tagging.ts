import { db } from './db/index';
import { tagTable, poiTable, poiTagTable } from './db/schema';
import { eq } from 'drizzle-orm';

// Helper function to add tags to a POI
async function tagPOI(poiId: number, tagIds: number[]) {
  console.log(`Tagging POI ${poiId} with tags: ${tagIds.join(', ')}`);
  
  for (const tagId of tagIds) {
    try {
      await db.insert(poiTagTable).values({
        poiId,
        tagId
      });
      console.log(`  ✅ Added tag ${tagId} to POI ${poiId}`);
    } catch (error) {
      console.log(`  ❌ Failed to add tag ${tagId} to POI ${poiId}:`, error);
    }
  }
}

// Helper function to get tag ID by name
async function getTagId(tagName: string): Promise<number | null> {
  const tag = await db.select().from(tagTable).where(eq(tagTable.name, tagName)).limit(1);
  return tag.length > 0 ? tag[0].id : null;
}

// Manual tagging function - you can call this with specific POI IDs and tag names
async function manualTagging() {
  // Example tagging based on the POIs we saw:
  
  // National Gallery Singapore - Art, Gallery, Museum, Modern, Architecture
  await tagPOI(1, [10, 11, 6, 18, 5]); // Art, Gallery, Museum, Modern, Architecture
  
  // Sultan Mosque - Mosque, Heritage, Architecture, Traditional, Culture
  await tagPOI(2, [8, 4, 5, 19, 3]); // Mosque, Heritage, Architecture, Traditional, Culture
  
  // Sri Mariamman Temple - Temple, Heritage, Architecture, Traditional, Culture
  await tagPOI(3, [7, 4, 5, 19, 3]); // Temple, Heritage, Architecture, Traditional, Culture
  
  // Armenian Church - Church, Heritage, Architecture, Traditional, History
  await tagPOI(4, [9, 4, 5, 19, 2]); // Church, Heritage, Architecture, Traditional, History
  
  // CHIJMES - Entertainment, Architecture, Heritage, Shopping
  await tagPOI(5, [14, 5, 4, 12]); // Entertainment, Architecture, Heritage, Shopping
  
  // St Andrew's Cathedral - Church, Architecture, Heritage, Traditional
  await tagPOI(6, [9, 5, 4, 19]); // Church, Architecture, Heritage, Traditional
  
  // Chinatown Food Street - Food, Culture, Traditional
  await tagPOI(9, [13, 3, 19]); // Food, Culture, Traditional
  
  // Chinatown Heritage Centre - Museum, Heritage, Culture, History
  await tagPOI(10, [6, 4, 3, 2]); // Museum, Heritage, Culture, History
  
  // Thian Hock Keng Temple - Temple, Heritage, Traditional, Culture
  await tagPOI(11, [7, 4, 19, 3]); // Temple, Heritage, Traditional, Culture
  
  // Esplanade Theatre - Entertainment, Architecture, Modern, Art
  await tagPOI(15, [14, 5, 18, 10]); // Entertainment, Architecture, Modern, Art
  
  console.log('Manual tagging completed for sample POIs!');
}

// Function to show current tagging status
async function showTaggingStatus() {
  const taggedPOIs = await db.select({
    poiId: poiTagTable.poiId,
    poiName: poiTable.name,
    tagId: poiTagTable.tagId,
    tagName: tagTable.name
  })
  .from(poiTagTable)
  .innerJoin(poiTable, eq(poiTable.id, poiTagTable.poiId))
  .innerJoin(tagTable, eq(tagTable.id, poiTagTable.tagId))
  .orderBy(poiTagTable.poiId);
  
  console.log('=== Current Tagging Status ===');
  let currentPOI = -1;
  
  taggedPOIs.forEach(row => {
    if (row.poiId !== currentPOI) {
      console.log(`\nPOI ${row.poiId}: ${row.poiName}`);
      currentPOI = row.poiId;
    }
    console.log(`  - ${row.tagName} (ID: ${row.tagId})`);
  });
  
  const totalTaggedPOIs = new Set(taggedPOIs.map(row => row.poiId)).size;
  console.log(`\nTotal POIs tagged: ${totalTaggedPOIs} out of 550`);
}

// Main execution
async function main() {
  try {
    // Show current status
    await showTaggingStatus();
    
    // Run manual tagging
    console.log('\n=== Starting Manual Tagging ===');
    await manualTagging();
    
    // Show updated status
    console.log('\n=== Updated Tagging Status ===');
    await showTaggingStatus();
    
  } catch (error) {
    console.error('Error during tagging:', error);
  }
}

main();