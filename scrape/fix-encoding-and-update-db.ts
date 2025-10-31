import { db } from "./db/index";
import { poiTable } from "./db/schema";
import * as fs from "fs";
import { eq } from "drizzle-orm";

interface CSVRow {
  poi_id: number;
  poi_name: string;
  poi_description: string;
  suggested_tags: string;
}

// Common UTF-8 mis-encodings and their correct replacements
const ENCODING_FIXES = new Map([
  // Apostrophes and quotes
  ['â€™', "'"],           // Right single quotation mark
  ['â€˜', "'"],           // Left single quotation mark
  ['â€œ', '"'],           // Left double quotation mark
  ['â€�', '"'],           // Right double quotation mark
  ['â€�', '"'],           // Alternative right double quotation mark
  
  // Dashes and hyphens
  ['â€"', '–'],           // En dash
  ['â€"', '—'],           // Em dash
  ['â€•', '―'],           // Horizontal bar
  
  // Other common mis-encodings
  ['â€¦', '…'],           // Horizontal ellipsis
  ['Â®', '®'],            // Registered trademark
  ['â„¢', '™'],           // Trademark
  ['Â©', '©'],            // Copyright
  ['Â°', '°'],            // Degree symbol
  ['Â', ''],              // Non-breaking space (often just remove)
  ['â€ ', ' '],           // Various space issues
  
  // Accented characters that might be mis-encoded
  ['Ã¡', 'á'],            // a with acute
  ['Ã©', 'é'],            // e with acute
  ['Ã­', 'í'],            // i with acute
  ['Ã³', 'ó'],            // o with acute
  ['Ãº', 'ú'],            // u with acute
  ['Ã±', 'ñ'],            // n with tilde
  ['Ã¼', 'ü'],            // u with diaeresis
  
  // Additional problematic sequences
  ['â€‹', ''],            // Zero-width space (remove)
  ['â€Œ', ''],            // Zero-width non-joiner (remove)
  ['â€�', ''],            // Zero-width joiner (remove)
]);

function fixEncoding(text: string): string {
  let fixed = text;
  
  // Apply all encoding fixes
  for (const [corrupted, correct] of ENCODING_FIXES) {
    fixed = fixed.replace(new RegExp(corrupted, 'g'), correct);
  }
  
  // Clean up any remaining weird characters or double spaces
  fixed = fixed
    .replace(/\s+/g, ' ')     // Multiple spaces to single space
    .trim();                   // Remove leading/trailing whitespace
  
  return fixed;
}

function parseCSVLine(line: string): CSVRow | null {
  // Enhanced CSV parsing to handle quotes and commas properly
  const regex = /^(\d+),"([^"]*(?:""[^"]*)*)","([^"]*(?:""[^"]*)*)","([^"]*(?:""[^"]*)*)"$/;
  const matches = line.match(regex);
  
  if (!matches) {
    // Try alternative parsing for lines with escaped quotes
    const altRegex = /^(\d+),\"(.*?)\",\"(.*?)\",\"(.*?)\"$/;
    const altMatches = line.match(altRegex);
    if (!altMatches) {
      return null;
    }
    return {
      poi_id: parseInt(altMatches[1]),
      poi_name: altMatches[2].replace(/""/g, '"'),
      poi_description: altMatches[3].replace(/""/g, '"'),
      suggested_tags: altMatches[4].replace(/""/g, '"')
    };
  }
  
  return {
    poi_id: parseInt(matches[1]),
    poi_name: matches[2].replace(/""/g, '"'),
    poi_description: matches[3].replace(/""/g, '"'),
    suggested_tags: matches[4].replace(/""/g, '"')
  };
}

async function fixEncodingAndUpdateDB() {
  try {
    console.log("🔧 Starting encoding fix and database update...");
    
    // Read the CSV file
    const csvContent = fs.readFileSync('poi_for_tagging.csv', 'utf8');
    const lines = csvContent.split('\n');
    
    // Skip header and filter out empty lines
    const dataLines = lines.slice(1).filter(line => line.trim());
    
    console.log(`Processing ${dataLines.length} POI entries`);
    
    const fixedLines = ['poi_id,poi_name,poi_description,suggested_tags']; // Header
    const updates = [];
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const line of dataLines) {
      try {
        const row = parseCSVLine(line);
        if (!row) {
          console.warn(`⚠️  Skipping invalid line: ${line.substring(0, 50)}...`);
          errorCount++;
          continue;
        }
        
        // Fix encoding issues
        const originalName = row.poi_name;
        const originalDescription = row.poi_description;
        
        const fixedName = fixEncoding(row.poi_name);
        const fixedDescription = fixEncoding(row.poi_description);
        const fixedTags = fixEncoding(row.suggested_tags);
        
        // Check if anything was actually fixed
        const wasFixed = (
          originalName !== fixedName || 
          originalDescription !== fixedDescription ||
          row.suggested_tags !== fixedTags
        );
        
        if (wasFixed) {
          console.log(`🔄 Fixed POI ${row.poi_id}: ${originalName}`);
          if (originalName !== fixedName) {
            console.log(`   Name: "${originalName}" → "${fixedName}"`);
          }
          if (originalDescription !== fixedDescription) {
            console.log(`   Description: "${originalDescription.substring(0, 50)}..." → "${fixedDescription.substring(0, 50)}..."`);
          }
          fixedCount++;
        }
        
        // Add to fixed CSV content
        const escapedName = fixedName.replace(/"/g, '""');
        const escapedDescription = fixedDescription.replace(/"/g, '""');
        const escapedTags = fixedTags.replace(/"/g, '""');
        
        fixedLines.push(`${row.poi_id},"${escapedName}","${escapedDescription}","${escapedTags}"`);
        
        // Prepare database update if name or description changed
        if (originalName !== fixedName || originalDescription !== fixedDescription) {
          updates.push({
            id: row.poi_id,
            name: fixedName,
            description: fixedDescription
          });
        }
        
      } catch (error) {
        console.error(`❌ Error processing line: ${line.substring(0, 50)}...`, error);
        errorCount++;
      }
    }
    
    // Write the fixed CSV file
    const fixedCSVContent = fixedLines.join('\n');
    fs.writeFileSync('poi_for_tagging_fixed.csv', fixedCSVContent, 'utf8');
    console.log(`📁 Created fixed CSV file: poi_for_tagging_fixed.csv`);
    
    // Update the database
    if (updates.length > 0) {
      console.log(`\n💾 Updating ${updates.length} POI entries in database...`);
      
      let updatedCount = 0;
      const batchSize = 50;
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        try {
          for (const update of batch) {
            await db.update(poiTable)
              .set({
                name: update.name,
                description: update.description
              })
              .where(eq(poiTable.id, update.id));
            
            updatedCount++;
          }
          
          console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)} (${batch.length} entries)`);
        } catch (error) {
          console.error(`❌ Error updating batch ${Math.floor(i / batchSize) + 1}:`, error);
        }
      }
      
      console.log(`\n🎉 Successfully updated ${updatedCount} POI entries in database`);
    } else {
      console.log("\n✨ No database updates needed - all entries were already correct!");
    }
    
    // Replace the original file with the fixed version
    fs.copyFileSync('poi_for_tagging_fixed.csv', 'poi_for_tagging.csv');
    console.log(`📝 Replaced original CSV file with fixed version`);
    
    console.log(`\n📈 Summary:`);
    console.log(`   • Total POIs processed: ${dataLines.length}`);
    console.log(`   • Encoding issues fixed: ${fixedCount}`);
    console.log(`   • Database entries updated: ${updates.length}`);
    console.log(`   • Errors encountered: ${errorCount}`);
    
    // Show examples of fixes made
    if (fixedCount > 0) {
      console.log(`\n🔍 Common fixes applied:`);
      const fixCounts = new Map();
      
      for (const line of dataLines) {
        const row = parseCSVLine(line);
        if (row) {
          const text = `${row.poi_name} ${row.poi_description}`;
          for (const [corrupted, correct] of ENCODING_FIXES) {
            if (text.includes(corrupted)) {
              fixCounts.set(`"${corrupted}" → "${correct}"`, (fixCounts.get(`"${corrupted}" → "${correct}"`) || 0) + 1);
            }
          }
        }
      }
      
      for (const [fix, count] of Array.from(fixCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
        console.log(`   • ${fix}: ${count} instances`);
      }
    }
    
  } catch (error) {
    console.error("❌ Fatal error during encoding fix:", error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixEncodingAndUpdateDB()
    .then(() => {
      console.log("\n🎊 Encoding fix and database update completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Encoding fix failed:", error);
      process.exit(1);
    });
}

export { fixEncodingAndUpdateDB, fixEncoding };