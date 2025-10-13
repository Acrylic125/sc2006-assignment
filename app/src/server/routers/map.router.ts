import z from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicOrProtectedProcedure,
  publicProcedure,
} from "../trpc";
import { db } from "@/db";
import {
  itineraryPOITable,
  itineraryTable,
  poiImagesTable,
  poiTable,
  poiTagTable,
  tagTable,
} from "@/db/schema";
import { and, eq, exists, gt, inArray, lt, not, sql } from "drizzle-orm";

export const mapRouter = createTRPCRouter({
  getTags: publicProcedure.query(async ({ ctx }) => {
    const tags = await db
      .select({ id: tagTable.id, name: tagTable.name })
      .from(tagTable);
    return tags;
  }),
  search: publicProcedure
    .input(
      z.object({
        showVisited: z.boolean(),
        showUnvisited: z.boolean(),
        excludedTags: z.array(z.number()),
        recommendFromLocation: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // No pois to show.
      if (!input.showVisited && !input.showUnvisited) {
        return [];
      }
      const conditions = [];
      
      // If there are excluded tags, only show POIs that have at least one non-excluded tag
      if (input.excludedTags.length > 0) {
        conditions.push(
          exists(
            db
              .select()
              .from(poiTagTable)
              .where(
                and(
                  eq(poiTagTable.poiId, poiTable.id),
                  not(inArray(poiTagTable.tagId, input.excludedTags))
                )
              )
              .limit(1)
          )
        );
      }
      if (input.showVisited !== input.showUnvisited && ctx.auth.userId) {
        const existent = db
          .select()
          .from(itineraryPOITable)
          .innerJoin(
            itineraryTable,
            eq(itineraryPOITable.itineraryId, itineraryTable.id)
          )
          .where(
            and(
              eq(itineraryPOITable.poiId, poiTable.id),
              eq(itineraryPOITable.checked, true),
              eq(itineraryTable.userId, ctx.auth.userId)
            )
          )
          .limit(1);
        if (input.showVisited) {
          conditions.push(exists(existent));
        } else {
          conditions.push(not(exists(existent)));
        }
      }

      if (input.recommendFromLocation) {
        const recommendationRadius = 5 / 111.32;
        conditions.push(
          lt(
            poiTable.latitude,
            sql`CAST(${input.recommendFromLocation.latitude + recommendationRadius} AS numeric)`
          )
        );
        conditions.push(
          gt(
            poiTable.latitude,
            sql`CAST(${input.recommendFromLocation.latitude - recommendationRadius} AS numeric)`
          )
        );
        conditions.push(
          lt(
            poiTable.longitude,
            sql`CAST(${input.recommendFromLocation.longitude + recommendationRadius} AS numeric)`
          )
        );
        conditions.push(
          gt(
            poiTable.longitude,
            sql`CAST(${input.recommendFromLocation.longitude - recommendationRadius} AS numeric)`
          )
        );
      }

      const pois = await db
        .select({
          id: poiTable.id,
          pos: {
            // Parse as number
            latitude: sql<number>`CAST(${poiTable.latitude} AS numeric)`,
            longitude: sql<number>`CAST(${poiTable.longitude} AS numeric)`,
          },
        })
        .from(poiTable)
        // .innerJoin(poiTagTable, eq(poiTable.id, poiTagTable.poiId))
        .where(and(...conditions));
      return pois;
    }),
  recommend: publicOrProtectedProcedure
    .input(
      z.object({
        fromLocation: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
        showVisited: z.boolean(),
        showUnvisited: z.boolean(),
        excludedTags: z.array(z.number()),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      // SG is near the equator, so we will do a rough approximtion of straight
      // line dstance.
      const recommendationRadius = 5 / 111.32;

      const pois = await db
        .select({
          id: poiTable.id,
          pos: {
            // Parse as number
            latitude: sql<number>`CAST(${poiTable.latitude} AS numeric)`,
            longitude: sql<number>`CAST(${poiTable.longitude} AS numeric)`,
          },
        })
        .from(poiTable)
        .where(
          and(
            lt(
              poiTable.latitude,
              sql`CAST(${input.fromLocation.latitude + recommendationRadius} AS numeric)`
            ),
            gt(
              poiTable.latitude,
              sql`CAST(${input.fromLocation.latitude - recommendationRadius} AS numeric)`
            ),
            lt(
              poiTable.longitude,
              sql`CAST(${input.fromLocation.longitude + recommendationRadius} AS numeric)`
            ),
            gt(
              poiTable.longitude,
              sql`CAST(${input.fromLocation.longitude - recommendationRadius} AS numeric)`
            )
          )
        );

      return pois;

      // TODO: Fetch from the database.
      // const pois: {
      //   id: number;
      //   pos: {
      //     latitude: number;
      //     longitude: number;
      //   };
      //   popularity: number; // [0, 1], higher means more popular
      // }[] = [];

      // // SG is near the equator, so we will do a rough approximtion of straight
      // // line dstance.
      // const longDistancePerDegree = 111.32;
      // const latDistancePerDegree = 111.32;

      // const recommendationRadius = 5;
      // let id = 1;
      // for (let i = -recommendationRadius; i < recommendationRadius; i++) {
      //   for (let j = -recommendationRadius; j < recommendationRadius; j++) {
      //     const coords = {
      //       latitude: input.fromLocation.latitude + j * 0.01,
      //       longitude: input.fromLocation.longitude + i * 0.01,
      //     };
      //     // SG is small, dont need to complicate comoutation.
      //     const distance = Math.sqrt(
      //       ((coords.latitude - input.fromLocation.latitude) *
      //         latDistancePerDegree) **
      //         2 +
      //         ((coords.longitude - input.fromLocation.longitude) *
      //           longDistancePerDegree) **
      //           2
      //     );
      //     if (distance > recommendationRadius) continue;

      //     pois.push({
      //       id: id++,
      //       pos: coords,
      //       // Mock the popularity
      //       popularity: Math.abs(Math.sin(i * 0.1) * Math.cos(j * 0.1)),
      //     });
      //   }
      // }
      // return pois;
    }),
  getPOI: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const poi = await db
        .select({
          id: poiTable.id,
          name: poiTable.name,
          description: poiTable.description,
          latitude: sql<number>`CAST(${poiTable.latitude} AS numeric)`,
          longitude: sql<number>`CAST(${poiTable.longitude} AS numeric)`,
        })
        .from(poiTable)
        .where(eq(poiTable.id, input.id))
        .limit(1);
      if (poi.length === 0) {
        return null;
      }
      const poiImages = await db
        .select({
          imageUrl: poiImagesTable.imageUrl,
        })
        .from(poiImagesTable)
        .where(eq(poiImagesTable.poiId, input.id));
      return { ...poi[0], images: poiImages.map((image) => image.imageUrl) };
    }),
});
