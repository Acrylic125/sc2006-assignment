import { db } from './db/index';
import { tagTable, poiTable } from './db/schema';

async function showTagsAndSamplePOIs() {
  console.log('=== Available Tags ===');
  const tags = await db.select().from(tagTable).orderBy(tagTable.id);
  tags.forEach(tag => console.log(`ID: ${tag.id}, Name: ${tag.name}`));
  
  console.log('\n=== Sample POIs (first 15) ===');
  const pois = await db.select({
    id: poiTable.id,
    name: poiTable.name,
    description: poiTable.description
  }).from(poiTable).limit(15);
  
  pois.forEach(poi => {
    console.log(`ID: ${poi.id}, Name: ${poi.name}`);
    console.log(`Description: ${poi.description.substring(0, 120)}...`);
    console.log('---');
  });
  
  console.log(`\nTotal POIs: ${pois.length} shown (out of 550 total)`);
}

showTagsAndSamplePOIs().catch(console.error);