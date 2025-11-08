import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import OpenAI from 'openai';
import { db } from "../../db";
import { poiTable, poiTagTable, tagTable } from "../../db/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";

// Types for POI data
interface POIWithDistance {
  id: number;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  tags: string[];
  distance: number;
}

interface CoordinatesResult {
  latitude: number;
  longitude: number;
  address: string;
}

// OpenRouter setup
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://sc2006-travel-app.local", 
    "X-Title": "SC2006 Travel Recommendation App", 
  },
});

// In-memory conversation storage (in production, use Redis or database)
// Structure: Map<userId, Map<conversationId, messages[]>>
const userConversations = new Map<string, Map<string, Array<{role: string, content: string, timestamp: Date}>>>();

// Helper function to generate a unique session ID for anonymous users
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to get or create user conversation storage
function getUserConversations(userId: string): Map<string, Array<{role: string, content: string, timestamp: Date}>> {
  if (!userConversations.has(userId)) {
    userConversations.set(userId, new Map());
  }
  return userConversations.get(userId)!;
}

// Helper function to query POIs near a location
async function getPOIsNearLocation(latitude: number, longitude: number, radiusKm: number = 2): Promise<POIWithDistance[]> {
  try {
    console.log(`Querying POIs near ${latitude}, ${longitude} within ${radiusKm}km`);
    
    // Simple bounding box calculation for Singapore (rough approximation)
    // 1 degree latitude ≈ 111km, 1 degree longitude ≈ 111km * cos(latitude)
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));
    
    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;
    
    // Query POIs within bounding box (using string comparison since DB stores as decimal)
    const poisWithTags = await db
      .select({
        id: poiTable.id,
        name: poiTable.name,
        description: poiTable.description,
        latitude: poiTable.latitude,
        longitude: poiTable.longitude,
      })
      .from(poiTable)
      .where(and(
        gte(poiTable.latitude, minLat.toString()),
        lte(poiTable.latitude, maxLat.toString()),
        gte(poiTable.longitude, minLon.toString()),
        lte(poiTable.longitude, maxLon.toString())
      ))
      .limit(10); // Get more than 5 for filtering

    // Get tags for these POIs
    const poiIds = poisWithTags.map(poi => poi.id);
    if (poiIds.length === 0) {
      return [];
    }

    const poiTagsData = await db
      .select({
        poiId: poiTagTable.poiId,
        tagName: tagTable.name,
      })
      .from(poiTagTable)
      .innerJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
      .where(sql`${poiTagTable.poiId} IN (${sql.join(poiIds.map(id => sql`${id}`), sql`, `)})`);

    // Group tags by POI
    const poiTagsMap = new Map<number, string[]>();
    poiTagsData.forEach(pt => {
      if (!poiTagsMap.has(pt.poiId)) {
        poiTagsMap.set(pt.poiId, []);
      }
      poiTagsMap.get(pt.poiId)!.push(pt.tagName);
    });

    // Calculate actual distances and sort by distance
    const poisWithDistance = poisWithTags.map(poi => {
      const tags = poiTagsMap.get(poi.id) || [];
      
      // Convert string coordinates to numbers for calculation
      const poiLat = parseFloat(poi.latitude);
      const poiLon = parseFloat(poi.longitude);
      
      // Haversine distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (poiLat - latitude) * Math.PI / 180;
      const dLon = (poiLon - longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(latitude * Math.PI / 180) * Math.cos(poiLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return {
        ...poi,
        tags,
        distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    })
    .filter(poi => poi.distance <= radiusKm) // Filter by actual distance
    .sort((a, b) => a.distance - b.distance) // Sort by distance
    .slice(0, 5); // Take top 5

    console.log(`Found ${poisWithDistance.length} POIs near location`);
    return poisWithDistance;

  } catch (error) {
    console.error("Error querying POIs near location:", error);
    return [];
  }
}

// OneMap API helper functions
let onemapToken: string | null = null;
let tokenExpiry: number | null = null;

// Get or refresh OneMap authentication token
async function getOnemapToken(): Promise<string> {
  // Check if we have a valid token
  if (onemapToken && tokenExpiry && Date.now() / 1000 < tokenExpiry) {
    return onemapToken;
  }

  try {
    console.log("Getting new OneMap authentication token...");
    
    // Note: You'll need to add these to your .env file
    const email = process.env.ONEMAP_EMAIL;
    const password = process.env.ONEMAP_PASSWORD;
    
    if (!email || !password) {
      throw new Error("OneMap credentials not configured. Please add ONEMAP_EMAIL and ONEMAP_PASSWORD to your .env file");
    }

    const response = await fetch("https://www.onemap.gov.sg/api/auth/post/getToken", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      }),
    });

    if (!response.ok) {
      throw new Error(`OneMap auth failed: ${response.status}`);
    }

    const data = await response.json();
    onemapToken = data.access_token;
    tokenExpiry = parseInt(data.expiry_timestamp);
    
    console.log("OneMap token obtained, expires:", new Date(tokenExpiry * 1000));
    return onemapToken!; // We know it's not null at this point
  } catch (error) {
    console.error("Failed to get OneMap token:", error);
    throw error;
  }
}

// Search for coordinates using place name
async function searchPlaceCoordinates(placeName: string): Promise<CoordinatesResult | null> {
  try {
    console.log(`Searching coordinates for: "${placeName}"`);
    
    const token = await getOnemapToken();
    const encodedPlace = encodeURIComponent(placeName);
    
    const response = await fetch(
      `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodedPlace}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': token,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`OneMap search failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.found > 0 && data.results && data.results.length > 0) {
      const result = data.results[0]; // Take the first (most relevant) result
      
      const coordinates = {
        latitude: parseFloat(result.LATITUDE),
        longitude: parseFloat(result.LONGITUDE),
        address: result.ADDRESS || result.SEARCHVAL
      };
      
      console.log(`Found coordinates for "${placeName}":`, coordinates);
      return coordinates;
    } else {
      console.log(`No results found for "${placeName}"`);
      return null;
    }
  } catch (error) {
    console.error("Error searching place coordinates:", error);
    return null;
  }
}

// Enhanced function that handles both coordinates and place names
async function getPOIsNearPlace(input: {latitude?: number, longitude?: number, placeName?: string}, radiusKm: number = 2): Promise<POIWithDistance[]> {
  let coordinates: {latitude: number, longitude: number} | null = null;
  
  try {
    // If coordinates are provided, use them directly
    if (input.latitude && input.longitude) {
      coordinates = {
        latitude: input.latitude,
        longitude: input.longitude
      };
      console.log(`Using provided coordinates: ${coordinates.latitude}, ${coordinates.longitude}`);
    }
    // If place name is provided, search for coordinates
    else if (input.placeName) {
      const searchResult = await searchPlaceCoordinates(input.placeName);
      if (searchResult) {
        coordinates = {
          latitude: searchResult.latitude,
          longitude: searchResult.longitude
        };
        console.log(`Found coordinates for "${input.placeName}": ${coordinates.latitude}, ${coordinates.longitude}`);
      } else {
        console.log(`Could not find coordinates for "${input.placeName}"`);
        return [];
      }
    } else {
      console.log("No coordinates or place name provided");
      return [];
    }

    // Query POIs using the coordinates
    if (coordinates) {
      return await getPOIsNearLocation(coordinates.latitude, coordinates.longitude, radiusKm);
    }
    
    return [];
  } catch (error) {
    console.error("Error in getPOIsNearPlace:", error);
    return [];
  }
}

export const chatbotRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(
      z.object({
        message: z.string(),
        userId: z.string().optional(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("Chatbot received message:", input.message);
      
      try {
        // Ensure each user has a unique identifier
        const userId = input.userId || generateSessionId();
        const isNewSession = !input.userId;
        
        // Get or create conversation ID - each user can have multiple conversations
        const conversationId = input.conversationId || 'default';
        
        console.log(`Processing message for userId: ${userId} (${isNewSession ? 'NEW SESSION' : 'EXISTING'}), conversationId: ${conversationId}`);
        
        // Get user's conversation storage
        const userConvs = getUserConversations(userId);
        
        // Get conversation history for this specific user and conversation
        let history = userConvs.get(conversationId) || [];
        
        console.log(`User ${userId} has ${history.length} previous messages in conversation ${conversationId}`);
        if (history.length > 0) {
          console.log("Previous messages:", history.map(h => `${h.role}: ${h.content.substring(0, 50)}...`));
        }
        
        // Clean old messages (keep last 10 exchanges = 20 messages)
        if (history.length > 20) {
          history = history.slice(-20);
        }
        
        // Add user message to history
        history.push({
          role: 'user',
          content: input.message,
          timestamp: new Date()
        });
        
        console.log(`After adding user message, history has ${history.length} messages`);

        // Build messages array for OpenAI with function calling capability
        const messages = [
          {
            role: "system" as const,
            content: `You are a knowledgeable and enthusiastic travel assistant specializing in Singapore! 🇸🇬

Your role:
- Help users discover amazing places, food, culture, and experiences in Singapore
- Provide specific recommendations with details like location, what to expect, and tips
- Be conversational, friendly, and use emojis to make interactions engaging
- Remember context from previous messages in the conversation - when you see previous messages, acknowledge them naturally
- Ask follow-up questions to better understand what users are looking for

Your capabilities:
- Use your extensive knowledge of Singapore for general recommendations
- When users ask about specific locations or areas (by coordinates, neighborhood names, or "near me"), use the get_nearby_pois function to get real-time POI data
- Combine your knowledge with fresh database results for the best recommendations

Your knowledge covers:
- Popular attractions (Marina Bay Sands, Gardens by the Bay, Sentosa, etc.)
- Food scenes (hawker centers, restaurants, local dishes like laksa, chicken rice, etc.)
- Cultural sites (temples, museums, heritage areas like Chinatown, Little India)
- Shopping areas (Orchard Road, Marina Bay, local markets)
- Nature spots (parks, gardens, waterfront areas)
- Transportation tips and getting around Singapore
- Local customs and practical advice

Function usage guidelines:
- Use get_nearby_pois when users provide coordinates, ask about specific areas, or say "near me"
- Use get_nearby_pois when users mention place names like "Marina Bay", "Orchard Road", "Changi Airport", "Sentosa", etc.
- Use get_nearby_pois when users want current/updated information about places in a specific location
- The function can handle both exact coordinates AND place names - you don't need coordinates anymore!
- For general questions, use your built-in knowledge
- Always be specific with names of places!

Be helpful, specific, and enthusiastic about Singapore's offerings!

Response formatting tips:
- Use ## for main sections (e.g., ## 🍜 Food Recommendations)
- Use **bold** for place names and important details (ensure no spaces: **text** not ** text **)
- Use - for bullet points when listing multiple places
- Keep paragraphs concise and well-structured
- Include practical info like addresses or MRT stations when relevant
- IMPORTANT: Always check that markdown formatting is correct (no ** ** with spaces)`
          },
          // Add conversation history
          ...history.map((msg: {role: string, content: string, timestamp: Date}) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content
          }))
        ];

        console.log(`Sending ${messages.length} messages to LLM (1 system + ${history.length} history)`);
        if (messages.length > 1) {
          console.log("Message history being sent:", messages.slice(1).map(m => `${m.role}: ${m.content.substring(0, 30)}...`));
        }

        // Define the tools that the LLM can call (new format)
        const tools = [
          {
            type: "function" as const,
            function: {
              name: "get_nearby_pois",
              description: "Get the top 5 points of interest near a specific location in Singapore. Use this when users ask about places near coordinates, place names, neighborhoods, or say 'near me'. You can provide either coordinates OR a place name.",
              parameters: {
                type: "object",
                properties: {
                  latitude: {
                    type: "number",
                    description: "Latitude coordinate of the location (optional if place_name is provided)"
                  },
                  longitude: {
                    type: "number", 
                    description: "Longitude coordinate of the location (optional if place_name is provided)"
                  },
                  place_name: {
                    type: "string",
                    description: "Name of a place, building, area, or landmark in Singapore (e.g. 'Marina Bay', 'Orchard Road', 'Changi Airport', 'Sentosa'). Optional if coordinates are provided."
                  },
                  radius_km: {
                    type: "number",
                    description: "Search radius in kilometers (default: 2km, max: 10km)",
                    minimum: 0.5,
                    maximum: 10
                  }
                },
                required: []
              }
            }
          }
        ];

        // Get model from environment variable with fallback
        const model = process.env.OPEN_ROUTER_MODEL || "google/gemma-2-9b-it:free";
        console.log(`Using model: ${model} for conversation: ${userId}:${conversationId}`);

        const completion = await openai.chat.completions.create({
          model: model,
          messages: messages,
          tools: tools,
          tool_choice: "auto", // Let the model decide when to call tools
          max_tokens: 500,
          temperature: 0.8,
        });

        let response = completion.choices[0]?.message?.content || "";
        const toolCalls = completion.choices[0]?.message?.tool_calls;

        // Handle tool calling (new format)
        if (toolCalls && toolCalls.length > 0) {
          const toolCall = toolCalls[0]; // Handle first tool call
          
          if (toolCall.type === "function" && toolCall.function?.name === "get_nearby_pois") {
            console.log("LLM requested POI data:", toolCall.function.arguments);
            
            try {
              const args = JSON.parse(toolCall.function.arguments || "{}");
              const { latitude, longitude, place_name, radius_km = 2 } = args;
              
              // Validate that we have either coordinates or place name
              const hasCoordinates = typeof latitude === 'number' && typeof longitude === 'number';
              const hasPlaceName = typeof place_name === 'string' && place_name.trim().length > 0;
              
              if (hasCoordinates || hasPlaceName) {
                // Query POIs using the enhanced function
                const nearbyPOIs = await getPOIsNearPlace({
                  latitude: hasCoordinates ? latitude : undefined,
                  longitude: hasCoordinates ? longitude : undefined,
                  placeName: hasPlaceName ? place_name : undefined
                }, radius_km);
                
                // Create tool result message
                const toolResult = {
                  role: "tool" as const,
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    location: { latitude, longitude, radius_km },
                    pois: nearbyPOIs.map(poi => ({
                      name: poi.name,
                      description: poi.description,
                      tags: poi.tags,
                      distance: poi.distance
                    })),
                    count: nearbyPOIs.length
                  })
                };

                // Create new messages array with proper typing for tool calls
                const messagesWithTool = [
                  ...messages,
                  {
                    role: "assistant" as const,
                    content: "",
                    tool_calls: toolCalls
                  },
                  toolResult
                ];

                // Get final response from LLM with the POI data
                const finalCompletion = await openai.chat.completions.create({
                  model: model,
                  messages: messagesWithTool as Parameters<typeof openai.chat.completions.create>[0]['messages'],
                  max_tokens: 600, // Increased for POI data processing
                  temperature: 0.8,
                });

                response = finalCompletion.choices[0]?.message?.content || 
                  `I found ${nearbyPOIs.length} places near your location! Here are some great options: ${nearbyPOIs.map(poi => poi.name).join(", ")}`;
                
                console.log(`Tool call successful: Found ${nearbyPOIs.length} POIs`);
              } else {
                response = "I need either coordinates or a place name to find places near you. Could you share your location, coordinates, or specify an area in Singapore like 'Marina Bay' or 'Orchard Road'? 📍";
              }
            } catch (error) {
              console.error("Tool call error:", error);
              response = "I had trouble looking up places in that area, but I can still help with general Singapore recommendations! What type of places are you looking for? 🤔";
            }
          }
        }

        if (!response) {
          response = "I'm sorry, I couldn't process that request. Could you try asking about specific places or experiences in Singapore? 🤔";
        }

        // Add assistant response to history
        history.push({
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });

        // Save updated history for this user and conversation
        userConvs.set(conversationId, history);

        console.log(`User ${userId} conversation ${conversationId} now has ${history.length} messages`);

        return {
          response,
          timestamp: new Date(),
          conversationId: conversationId,
          userId: userId, // Return the userId so frontend knows which user this belongs to
        };

      } catch (error) {
        console.error("Chatbot error:", error);
        
        // Recreate user identification for error handling
        const errorUserId = input.userId || generateSessionId();
        const errorConversationId = input.conversationId || 'default';
        
        // Simple fallback response
        const message = input.message.toLowerCase();
        let fallbackResponse = "I'm having trouble with my connection right now 🤖 ";

        if (message.includes("food") || message.includes("eat") || message.includes("hungry")) {
          fallbackResponse += "but I can still recommend some great Singapore food! Try hawker centers like Maxwell Food Centre for chicken rice, or Newton Food Centre for satay and laksa! 🍜";
        } else if (message.includes("culture") || message.includes("temple") || message.includes("museum")) {
          fallbackResponse += "but for culture, I'd suggest visiting Chinatown, Little India, or the National Museum of Singapore! 🏛️";
        } else if (message.includes("nature") || message.includes("park") || message.includes("outdoor")) {
          fallbackResponse += "but for nature, Gardens by the Bay and Singapore Botanic Gardens are must-visits! 🌿";
        } else if (message.includes("shopping") || message.includes("mall")) {
          fallbackResponse += "but for shopping, Orchard Road is Singapore's main shopping district! 🛍️";
        } else {
          fallbackResponse += "Could you try asking me again? I love helping with Singapore travel tips! ✈️";
        }

        return {
          response: fallbackResponse,
          timestamp: new Date(),
          conversationId: errorConversationId,
          userId: errorUserId,
        };
      }
    }),

  // New endpoint to clear conversation history for a specific user
  clearConversation: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        conversationId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const userConvs = userConversations.get(input.userId);
      if (!userConvs) {
        return { success: true, message: "No conversations found for user" };
      }

      if (input.conversationId) {
        // Clear specific conversation
        userConvs.delete(input.conversationId);
        return { success: true, message: `Conversation ${input.conversationId} cleared` };
      } else {
        // Clear all conversations for user
        userConversations.delete(input.userId);
        return { success: true, message: "All conversations cleared for user" };
      }
    }),

  // New endpoint to get conversation history for a specific user
  getConversationHistory: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        conversationId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const userConvs = userConversations.get(input.userId);
      if (!userConvs) {
        return { 
          messages: [],
          messageCount: 0,
          conversations: []
        };
      }

      if (input.conversationId) {
        // Get specific conversation
        const history = userConvs.get(input.conversationId) || [];
        return { 
          messages: history,
          messageCount: history.length,
          conversationId: input.conversationId
        };
      } else {
        // Get all conversations for user (summary)
        const conversations = Array.from(userConvs.entries()).map(([convId, messages]) => ({
          conversationId: convId,
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]?.timestamp || null
        }));
        
        return {
          conversations,
          totalConversations: conversations.length
        };
      }
    }),

  // New endpoint to directly query POIs near a location or place
  getPOIsNearLocation: publicProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        placeName: z.string().optional(),
        radiusKm: z.number().min(0.5).max(10).optional().default(2),
      }).refine(
        (data) => (data.latitude && data.longitude) || data.placeName,
        {
          message: "Either coordinates (latitude & longitude) or placeName must be provided",
        }
      )
    )
    .query(async ({ input }) => {
      if (input.latitude && input.longitude) {
        console.log(`Direct POI query by coordinates: ${input.latitude}, ${input.longitude}, ${input.radiusKm}km`);
      } else {
        console.log(`Direct POI query by place name: "${input.placeName}", ${input.radiusKm}km`);
      }
      
      try {
        const pois = await getPOIsNearPlace({
          latitude: input.latitude,
          longitude: input.longitude,
          placeName: input.placeName
        }, input.radiusKm);
        
        return {
          success: true,
          location: {
            latitude: input.latitude,
            longitude: input.longitude,
            placeName: input.placeName,
            radius: input.radiusKm
          },
          pois: pois,
          count: pois.length
        };
      } catch (error) {
        console.error("Error in getPOIsNearLocation endpoint:", error);
        return {
          success: false,
          error: "Failed to query POIs near location",
          pois: [],
          count: 0
        };
      }
    }),
});