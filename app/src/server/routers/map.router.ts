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
  reviewTable,
  tagTable,
  userSurpriseMePreferencesTable,
} from "@/db/schema";
import { and, eq, exists, gt, inArray, lt, not, sql } from "drizzle-orm";

async function searchPOIS(
  input: {
    showVisited: boolean;
    showUnvisited: boolean;
    excludedTags: number[];
    recommendFromLocation?: {
      latitude: number;
      longitude: number;
    };
  },
  ctx: { auth: { userId: string | null } }
) {
  // No pois to show.
  if (!input.showVisited && !input.showUnvisited) {
    return [];
  }
  const conditions = [
    not(
      exists(
        db
          .select()
          .from(poiTagTable)
          .where(
            and(
              eq(poiTagTable.poiId, poiTable.id),
              inArray(poiTagTable.tagId, input.excludedTags)
            )
          )
          .limit(1)
      )
    ),
  ];
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
    .where(and(...conditions));
  return pois;
}

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
      return searchPOIS(input, ctx);
    }),
  recommend: publicOrProtectedProcedure
    .input(
      z.object({
        showVisited: z.boolean(),
        showUnvisited: z.boolean(),
        excludedTags: z.array(z.number()),
        recommendFromLocation: z.object({
          latitude: z.number(),
          longitude: z.number(),
        }),
      })
    )
    .query(async ({ ctx, input }) => {
      const [tags, pois, userPreferences] = await Promise.all([
        db
          .select({
            id: tagTable.id,
            name: tagTable.name,
          })
          .from(tagTable),
        searchPOIS(input, ctx),
        (async () => {
          if (!ctx.auth.userId) {
            return [];
          }
          return db
            .select({
              tagId: poiTagTable.tagId,
              likedScore: sql<number>`SUM(CASE WHEN ${userSurpriseMePreferencesTable.liked} = true THEN 1 ELSE -1 END)`,
            })
            .from(userSurpriseMePreferencesTable)
            .innerJoin(
              poiTagTable,
              eq(userSurpriseMePreferencesTable.poiId, poiTagTable.poiId)
            )
            .where(eq(userSurpriseMePreferencesTable.userId, ctx.auth.userId))
            .groupBy(poiTagTable.tagId);
        })(),
      ]);

      const [poiTags, poiReviews] = await Promise.all([
        db
          .select({
            poiId: poiTagTable.poiId,
            tagId: poiTagTable.tagId,
          })
          .from(poiTagTable)
          .where(
            inArray(
              poiTagTable.poiId,
              pois.map((poi) => poi.id)
            )
          ),
        db
          .select({
            poiId: reviewTable.poiId,
            numberOfReviews: sql<number>`COUNT(${reviewTable.id})`,
            likesProportion: sql<number>`COUNT(CASE WHEN ${reviewTable.liked} = true THEN 1 END)`,
          })
          .from(reviewTable)
          .where(
            inArray(
              reviewTable.poiId,
              pois.map((poi) => poi.id)
            )
          )
          .groupBy(reviewTable.poiId),
      ]);

      // Create tag mapping to index.
      const tagMapping = new Map<number, number>();
      for (let i = 0; i < tags.length; i++) {
        tagMapping.set(tags[i].id, i);
      }

      // Create poi mapping to index.
      const poiMapping = new Map<number, number>();
      for (let i = 0; i < pois.length; i++) {
        poiMapping.set(pois[i].id, i);
      }

      // Let |P| be the number of pois and |T| be the number of tags.
      // Create |P| x |T| matrix containing 1 if poi has tag, 0 otherwise.
      const poiTagMatrix = new Array(pois.length)
        .fill(0)
        .map(() => new Array(tags.length).fill(0));
      for (const poiTag of poiTags) {
        const tagIndex = tagMapping.get(poiTag.tagId);
        if (tagIndex === undefined) {
          continue;
        }
        const poiIndex = poiMapping.get(poiTag.poiId);
        if (poiIndex === undefined) {
          continue;
        }
        poiTagMatrix[poiIndex][tagIndex] = 1;
      }

      // Create |P| x 1 matrix containing the number of reviews for each poi.
      // Create |P| x 1 matrix containing the likes proportion for each poi.
      const numberOfPoiReviewsMatrix = new Array(pois.length).fill(0);
      // Already normalized.
      const poiLikesProportionMatrix = new Array(pois.length).fill(0);
      for (const poiReview of poiReviews) {
        const poiIndex = poiMapping.get(poiReview.poiId);
        if (poiIndex === undefined) {
          continue;
        }
        numberOfPoiReviewsMatrix[poiIndex] = poiReview.numberOfReviews;
        poiLikesProportionMatrix[poiIndex] = poiReview.likesProportion;
      }

      // We use log to avoid domination by outliers.
      const maxLogNormalizedNumberOfPoiReviews = Math.log2(
        1 + Math.max(...numberOfPoiReviewsMatrix)
      );
      const logNormalizedNumberOfPoiReviewsMatrix =
        maxLogNormalizedNumberOfPoiReviews > 0
          ? numberOfPoiReviewsMatrix.map(
              (score) =>
                Math.log2(score + 1) / maxLogNormalizedNumberOfPoiReviews
            )
          : new Array<number>(pois.length).fill(0);

      // Create |T| x 1 matrix containing the user preference score for each poi.
      const poiUserPreferenceMatrix = new Array<number>(tags.length).fill(0);
      for (const userPreference of userPreferences) {
        const tagIndex = tagMapping.get(userPreference.tagId);
        if (tagIndex === undefined) {
          continue;
        }
        poiUserPreferenceMatrix[tagIndex] = userPreference.likedScore;
      }

      // Create |P| x 1 matrix containing the preference score for each poi.
      // poiPreferenceMatrix = poiUserPreferenceMatrix @ poiTagMatrix
      const poiPreferenceMatrix = new Array<number>(pois.length).fill(0);
      for (let i = 0; i < pois.length; i++) {
        poiPreferenceMatrix[i] = poiUserPreferenceMatrix
          .map((score, tagIndex) => score * poiTagMatrix[i][tagIndex])
          .reduce((a, b) => a + b, 0);
      }
      // Normalize the poiPreferenceMatrix.
      const maxPreference = Math.max(...poiPreferenceMatrix);
      const minPreference = Math.min(...poiPreferenceMatrix);
      const deltaPreference = maxPreference - minPreference;
      const normalizedPreferenceMatrix =
        deltaPreference > 0
          ? poiPreferenceMatrix.map(
              (score) => (score - minPreference) / deltaPreference
            )
          : poiPreferenceMatrix.map(() => 0);

      const weights = [0.5, 0.3, 0.2];
      const M = [
        normalizedPreferenceMatrix,
        logNormalizedNumberOfPoiReviewsMatrix,
        poiLikesProportionMatrix,
      ];

      // Now we compute the preference scores for each poi.
      const poiScores = new Array<{ index: number; score: number }>(pois.length)
        .fill({ index: 0, score: 0 })
        .map((_, i) => ({ index: i, score: 0 }));
      // poiScores = M @ weights
      for (let i = 0; i < pois.length; i++) {
        let score = 0;
        for (let j = 0; j < M.length; j++) {
          score += M[j][i] * weights[j];
        }
        poiScores[i].score = score;
      }

      const top5 = poiScores.sort((a, b) => b.score - a.score).slice(0, 5);
      return top5.map((poi) => pois[poi.index]);

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
