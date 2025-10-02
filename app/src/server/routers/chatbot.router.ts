import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/db";
import { poiTable, tagTable, poiTagTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from 'openai';

// OpenRouter setup (same as in scraping script)
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://sc2006-travel-app.local", 
    "X-Title": "SC2006 Travel Recommendation App", 
  },
});

export const chatbotRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(
      z.object({
        message: z.string(),
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("Chatbot received message:", input.message);
      
      try {
        // Get all POIs with their tags from database
        const poisWithTags = await db
          .select({
            id: poiTable.id,
            name: poiTable.name,
            description: poiTable.description,
            latitude: poiTable.latitude,
            longitude: poiTable.longitude,
          })
          .from(poiTable);

        // Get tags for each POI
        const poiTagsData = await db
          .select({
            poiId: poiTagTable.poiId,
            tagName: tagTable.name,
          })
          .from(poiTagTable)
          .innerJoin(tagTable, eq(poiTagTable.tagId, tagTable.id));

        // Group tags by POI
        const poiTagsMap = new Map<number, string[]>();
        poiTagsData.forEach(pt => {
          if (!poiTagsMap.has(pt.poiId)) {
            poiTagsMap.set(pt.poiId, []);
          }
          poiTagsMap.get(pt.poiId)!.push(pt.tagName);
        });

        // Create context for AI - include ALL POIs but in a more compact format
        let poiContext = poisWithTags
          .map(poi => {
            const tags = poiTagsMap.get(poi.id) || [];
            // Compact format: Name | Description (first 100 chars) | Tags
            const shortDescription = poi.description.length > 100 
              ? poi.description.substring(0, 100) + "..." 
              : poi.description;
            return `${poi.name} | ${shortDescription} | Tags: ${tags.join(", ")}`;
          })
          .join("\n");

        // If context is too large (>50,000 chars), use a more compact format
        if (poiContext.length > 50000) {
          console.log("POI context too large, using compact format...");
          poiContext = poisWithTags
            .map(poi => {
              const tags = poiTagsMap.get(poi.id) || [];
              // Ultra-compact: Name | First 50 chars | Key tags only
              const veryShortDescription = poi.description.substring(0, 50) + "...";
              const keyTags = tags.slice(0, 3); // Only first 3 tags
              return `${poi.name} | ${veryShortDescription} | ${keyTags.join(",")}`;
            })
            .join("\n");
        }

        console.log(`Sending ${poisWithTags.length} POIs to AI (${poiContext.length} characters)`);
        console.log("Sending request to OpenRouter...");

        // Get unique tags for context
        const allTags = [...new Set(poiTagsData.map(pt => pt.tagName))];
        
        console.log(`Database stats: ${poisWithTags.length} POIs, ${allTags.length} unique tags`);
        console.log(`Available tags: ${allTags.join(", ")}`);

        const completion = await openai.chat.completions.create({
          model: "x-ai/grok-4-fast:free",
          messages: [
            {
              role: "system",
              content: `You are a helpful travel assistant for Singapore. You have access to a comprehensive database of ${poisWithTags.length} points of interest across Singapore.

AVAILABLE CATEGORIES: ${allTags.join(", ")}

POI DATABASE (Format: Name | Description | Tags):
${poiContext}

Guidelines:
- You have access to ${poisWithTags.length} points of interest in Singapore
- Provide specific recommendations from the POI data above
- Be conversational and enthusiastic about Singapore
- When users ask about categories (food, culture, nature, etc.), find and recommend relevant POIs
- Include the exact POI names when making recommendations
- You can suggest 3-5 places per response for variety
- Keep responses concise but informative
- If you can't find exact matches, suggest the closest relevant POIs
- Use emojis to make responses friendly and engaging
- Always prioritize POIs from the database over general suggestions`
            },
            {
              role: "user",
              content: input.message
            }
          ],
          max_tokens: 800, // Increased for better responses
          temperature: 0.7,
        });

        const response = completion.choices[0]?.message?.content || 
          "I'm sorry, I couldn't process that request. Could you try asking about specific types of places you'd like to visit? 🤔";

        console.log("OpenRouter response received");

        return {
          response,
          timestamp: new Date(),
        };

      } catch (error) {
        console.error("Chatbot error:", error);
        
        // Fallback response with basic keyword matching
        const message = input.message.toLowerCase();
        let fallbackResponse = "I'm having trouble connecting to my AI brain right now 🤖, but I can still help! ";

        if (message.includes("food") || message.includes("eat") || message.includes("restaurant")) {
          fallbackResponse += "For food recommendations, try filtering the map by 'Food' tags to see restaurants and cafes!";
        } else if (message.includes("culture") || message.includes("museum") || message.includes("history")) {
          fallbackResponse += "For cultural experiences, check out the 'Culture' and 'History' tags on the map!";
        } else if (message.includes("nature") || message.includes("park") || message.includes("outdoor")) {
          fallbackResponse += "For outdoor activities, look for places tagged with 'Nature' and 'Park' on the map!";
        } else {
          fallbackResponse += "Try using the filter buttons above the map to explore different categories of places!";
        }

        return {
          response: fallbackResponse,
          timestamp: new Date(),
        };
      }
    }),
});