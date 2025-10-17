import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import {
  poiTable,
  poiImagesTable,
  tagTable,
  poiTagTable,
  userSurpriseMePreferencesTable,
} from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import z from "zod";

export const poisRouter = createTRPCRouter({
  indicatePreference: protectedProcedure
    .input(
      z.object({
        removeOld: z.boolean().default(false),
        preferences: z.array(
          z.object({
            poiId: z.number(),
            liked: z.boolean(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.transaction(async (tx) => {
        if (input.removeOld) {
          await tx
            .delete(userSurpriseMePreferencesTable)
            .where(eq(userSurpriseMePreferencesTable.userId, ctx.auth.userId));
        }
        if (input.preferences.length === 0) {
          return;
        }
        await tx.insert(userSurpriseMePreferencesTable).values(
          input.preferences.map((preference) => ({
            poiId: preference.poiId,
            liked: preference.liked,
            userId: ctx.auth.userId,
          }))
        );
      });
    }),

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
        .where(sql`${poiImagesTable.imageUrl} IS NOT NULL`) // Ensure imageUrl is valid
        .groupBy(poiTable.id, poiImagesTable.imageUrl)
        .orderBy(sql`RANDOM()`) // Randomize the POIs
        .limit(5);

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
