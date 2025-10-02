import * as fs from "fs";
import OpenAI from 'openai';
import dotenv from 'dotenv';

// OpenAI API setup through OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://sc2006-poi-tagging.local", // Site URL for rankings
    "X-Title": "SC2006 POI Tagging System", // Site title for rankings
  },
});

interface POI {
  poi_id: number;
  poi_name: string;
  poi_description: string;
  suggested_tags: string;
}

// Available tags for reference
const AVAILABLE_TAGS = [
  "Park", "History", "Culture", "Heritage", "Architecture", 
  "Museum", "Temple", "Mosque", "Church", "Art", "Gallery", 
  "Shopping", "Food", "Entertainment", "Nature", "Viewpoint", 
  "Memorial", "Modern", "Traditional", "Waterfront"
];

function parseCSV(csvContent: string): POI[] {
  const lines = csvContent.split('\n');
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  return dataLines.map(line => {
    const matches = line.match(/^(\d+),"([^"]*?)","([^"]*?)","([^"]*?)"$/);
    if (!matches) {
      throw new Error(`Invalid CSV line: ${line}`);
    }
    
    const [, poiIdStr, poiName, poiDescription, suggestedTags] = matches;
    return {
      poi_id: parseInt(poiIdStr),
      poi_name: poiName,
      poi_description: poiDescription,
      suggested_tags: suggestedTags,
    };
  });
}

function generateCSV(pois: POI[]): string {
  const header = 'poi_id,poi_name,poi_description,suggested_tags\n';
  const rows = pois.map(poi => {
    const escapedName = `"${poi.poi_name.replace(/"/g, '""')}"`;
    const escapedDescription = `"${poi.poi_description.replace(/"/g, '""')}"`;
    const escapedTags = `"${poi.suggested_tags.replace(/"/g, '""')}"`;
    return `${poi.poi_id},${escapedName},${escapedDescription},${escapedTags}`;
  });
  
  return header + rows.join('\n');
}

// Function removed - user will handle failed cases manually

// Function to call OpenAI API through OpenRouter for POI tagging
async function tagPOIWithLLM(poi: POI): Promise<string> {
  try {
    const prompt = `Given this Point of Interest in Singapore, suggest appropriate tags from the available list.

POI Name: ${poi.poi_name}
Description: ${poi.poi_description}

Available tags: ${AVAILABLE_TAGS.join(', ')}

Instructions:
- Return only the tag names that best fit this POI
- Separate multiple tags with commas
- Use exact tag names from the available list
- Consider the POI's type, purpose, and characteristics
- Return a maximum of 5 tags

Tags:`;

    const response = await openai.chat.completions.create({
      model: "x-ai/grok-4-fast:free",
      messages: [{ 
        role: "user", 
        content: prompt 
      }],
      max_tokens: 100,
      temperature: 0.1,
    });

    const suggestedTags = response.choices[0].message.content?.trim() || '';
    
    // Clean up the response and filter to only valid tags
    const tags = suggestedTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => AVAILABLE_TAGS.includes(tag));
    
    return tags.join(',');
    
  } catch (error) {
    console.error(`❌ Error tagging POI ${poi.poi_id} (${poi.poi_name}):`, error);
    
    // Return empty string - user will handle failed cases manually
    return "";
  }
}

async function processTagging() {
  try {
    console.log("Starting POI tagging process...");
    
    // Read the CSV file
    const csvContent = fs.readFileSync('poi_for_tagging.csv', 'utf8');
    const pois = parseCSV(csvContent);
    
    console.log(`Processing ${pois.length} POIs...`);
    
    // Process each POI
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      
      if (!poi.suggested_tags.trim()) {
        // Tag the POI using LLM API
        const suggestedTags = await tagPOIWithLLM(poi);
        poi.suggested_tags = suggestedTags;
        
        console.log(`${i + 1}/${pois.length}: ${poi.poi_name} -> ${suggestedTags}`);
        
        // Add a delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      } else {
        console.log(`${i + 1}/${pois.length}: ${poi.poi_name} (already tagged)`);
      }
    }
    
    // Write the updated CSV
    const updatedCSV = generateCSV(pois);
    fs.writeFileSync('poi_for_tagging.csv', updatedCSV, 'utf8');
    
    console.log("✅ POI tagging completed!");
    console.log("Next step: Run 'pnpx ts-node import-tagged-pois.ts' to import the tags to database");
    
  } catch (error) {
    console.error("Error during tagging process:", error);
  }
}

// Run the tagging process
processTagging().then(() => {
  console.log("Tagging process completed");
  process.exit(0);
}).catch((error) => {
  console.error("Tagging process failed:", error);
  process.exit(1);
});