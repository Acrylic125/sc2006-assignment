import z from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicOrProtectedProcedure,
  publicProcedure,
} from "../trpc";
import { db } from "@/db";
import { poiImagesTable, poiTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const mapRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        showVisited: z.boolean(),
        showUnvisited: z.boolean(),
        excludedTags: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const pois = await db
        .select({
          id: poiTable.id,
          pos: {
            // Parse as number
            latitude: sql<number>`CAST(${poiTable.latitude} AS numeric)`,
            longitude: sql<number>`CAST(${poiTable.longitude} AS numeric)`,
          },
        })
        .from(poiTable);
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
      // let id = 1;
      // for (let i = -10; i < 10; i++) {
      //   for (let j = -10; j < 10; j++) {
      //     pois.push({
      //       id: id++,
      //       pos: {
      //         latitude: 1.3521 + j * 0.01,
      //         longitude: 103.8198 + i * 0.01,
      //       },
      //       // Mock the popularity
      //       popularity: Math.abs(Math.sin(i * 0.1) * Math.cos(j * 0.1)),
      //     });
      //   }
      // }
      // return pois;
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
        excludedTags: z.array(z.string()),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      // TODO: Fetch from the database.
      const pois: {
        id: number;
        pos: {
          latitude: number;
          longitude: number;
        };
        popularity: number; // [0, 1], higher means more popular
      }[] = [];

      // SG is near the equator, so we will do a rough approximtion of straight
      // line dstance.
      const longDistancePerDegree = 111.32;
      const latDistancePerDegree = 111.32;

      const recommendationRadius = 5;
      let id = 1;
      for (let i = -recommendationRadius; i < recommendationRadius; i++) {
        for (let j = -recommendationRadius; j < recommendationRadius; j++) {
          const coords = {
            latitude: input.fromLocation.latitude + j * 0.01,
            longitude: input.fromLocation.longitude + i * 0.01,
          };
          // SG is small, dont need to complicate comoutation.
          const distance = Math.sqrt(
            ((coords.latitude - input.fromLocation.latitude) *
              latDistancePerDegree) **
              2 +
              ((coords.longitude - input.fromLocation.longitude) *
                longDistancePerDegree) **
                2
          );
          if (distance > recommendationRadius) continue;

          pois.push({
            id: id++,
            pos: coords,
            // Mock the popularity
            popularity: Math.abs(Math.sin(i * 0.1) * Math.cos(j * 0.1)),
          });
        }
      }
      return pois;
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
