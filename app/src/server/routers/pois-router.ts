import { createTRPCRouter, publicProcedure } from "../trpc";
import { db } from "@/db";
import { poiTable, poiImagesTable, tagTable, poiTagTable } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import z from "zod";

export const poisRouter = createTRPCRouter({
  // Fetch random POIs
  getPois: publicProcedure.query(async () => {
    try {
      const pois = await db
        .select({
          id: poiTable.id,
          name: poiTable.name,
          description: poiTable.description,
          imageUrl: poiImagesTable.imageUrl,
          latitude: poiTable.latitude, // Include latitude
          longitude: poiTable.longitude, // Include longitude
          tags: sql`array_agg(${tagTable.name})`.as("tags"),
        })
        .from(poiTable)
        .leftJoin(poiImagesTable, eq(poiTable.id, poiImagesTable.poiId))
        .leftJoin(poiTagTable, eq(poiTable.id, poiTagTable.poiId))
        .leftJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
        .groupBy(poiTable.id, poiImagesTable.imageUrl)
        .orderBy(sql`RANDOM()`) // Randomize the POIs
        .limit(10);

      return pois;
    } catch (error) {
      console.error("Error fetching POIs:", error);
      throw new Error("Failed to fetch POIs");
    }
  }),

  // Fetch recommended POIs based on tag weights
  getRecommendations: publicProcedure
    .input(z.object({ tagWeights: z.record(z.string(), z.number()) }))
    .query(async ({ input, ctx }) => {
      try {
        const tags = Object.keys(input.tagWeights);
        const pois = await db 
          .select({
            id: poiTable.id,
            name: poiTable.name,
            description: poiTable.description,
            imageUrl: poiImagesTable.imageUrl,
            latitude: poiTable.latitude, // Include latitude
            longitude: poiTable.longitude, // Include longitude
            tags: sql`array_agg(${tagTable.name})`.as("tags"),
          })
          .from(poiTable)
          .leftJoin(poiImagesTable, eq(poiTable.id, poiImagesTable.poiId))
          .leftJoin(poiTagTable, eq(poiTable.id, poiTagTable.poiId))
          .leftJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
          .where(sql`${tagTable.name} = ANY(${tags})`) // Match tags with tagWeights
          .groupBy(poiTable.id, poiImagesTable.imageUrl)
          .orderBy(sql`RANDOM()`) // Randomize the recommendations
          .limit(10);

        return pois;
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        throw new Error("Failed to fetch recommendations");
      }
    }),
});