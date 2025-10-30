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
import { env } from "@/lib/env";
import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export class RecommendationEngine {
  private numberOfTags: number;
  private numberOfPois: number;

  private tagMapping = new Map<number, number>();
  private poiMapping = new Map<number, number>();

  private poiTagMatrix: number[][];
  private numberOfPoiReviewsMatrix: number[];
  private poiLikesProportionMatrix: number[];

  public weights: number[] = [0.5, 0.3, 0.2];

  public constructor(tags: { id: number }[], pois: { id: number }[]) {
    this.numberOfTags = tags.length;
    this.numberOfPois = pois.length;

    // Initialize mappings.
    for (let i = 0; i < tags.length; i++) {
      this.tagMapping.set(tags[i].id, i);
    }
    for (let i = 0; i < pois.length; i++) {
      this.poiMapping.set(pois[i].id, i);
    }

    // Initialize matrices.
    this.poiTagMatrix = new Array(this.numberOfPois)
      .fill(0)
      .map(() => new Array(this.numberOfTags).fill(0));
    this.numberOfPoiReviewsMatrix = new Array(this.numberOfPois).fill(0);
    this.poiLikesProportionMatrix = new Array(this.numberOfPois).fill(0);
  }

  public getPoiMappings() {
    return this.poiMapping;
  }

  public getTagMappings() {
    return this.tagMapping;
  }

  public setPoiTags(poiTags: { poiId: number; tagId: number }[]) {
    for (const poiTag of poiTags) {
      const tagIndex = this.tagMapping.get(poiTag.tagId);
      if (tagIndex === undefined) {
        continue;
      }
      const poiIndex = this.poiMapping.get(poiTag.poiId);
      if (poiIndex === undefined) {
        continue;
      }
      this.poiTagMatrix[poiIndex][tagIndex] = 1;
    }
  }

  public setNumberOfPoiReviews(
    poiReviews: { poiId: number; numberOfReviews: number }[]
  ) {
    for (const poiReview of poiReviews) {
      const poiIndex = this.poiMapping.get(poiReview.poiId);
      if (poiIndex === undefined) {
        continue;
      }
      this.numberOfPoiReviewsMatrix[poiIndex] = poiReview.numberOfReviews;
    }

    // Log normalize the number of reviews.
    const maxLogNormalizedNumberOfPoiReviews = Math.log2(
      1 + Math.max(...this.numberOfPoiReviewsMatrix)
    );
    this.numberOfPoiReviewsMatrix =
      maxLogNormalizedNumberOfPoiReviews > 0
        ? this.numberOfPoiReviewsMatrix.map(
            (score) => Math.log2(score + 1) / maxLogNormalizedNumberOfPoiReviews
          )
        : new Array<number>(this.numberOfPois).fill(0);
  }

  public setPoiLikesProportion(
    poiLikesProportion: { poiId: number; likesProportion: number }[]
  ) {
    for (const poiLikeProportion of poiLikesProportion) {
      const poiIndex = this.poiMapping.get(poiLikeProportion.poiId);
      if (poiIndex === undefined) {
        continue;
      }
      this.poiLikesProportionMatrix[poiIndex] =
        poiLikeProportion.likesProportion;
    }
  }

  public recommend(userPreferences: { tagId: number; likedScore: number }[]) {
    // Create |T| x 1 matrix containing the user preference score for each poi.
    const poiUserPreferenceMatrix = new Array<number>(this.numberOfTags).fill(
      0
    );
    for (const userPreference of userPreferences) {
      const tagIndex = this.tagMapping.get(userPreference.tagId);
      if (tagIndex === undefined) {
        continue;
      }
      poiUserPreferenceMatrix[tagIndex] = userPreference.likedScore;
    }

    const M = [
      poiUserPreferenceMatrix,
      this.numberOfPoiReviewsMatrix,
      this.poiLikesProportionMatrix,
    ];
    if (M.length !== this.weights.length) {
      throw new Error("The number of matrices and weights must be the same.");
    }

    // Now we compute the preference scores for each poi.
    const poiScores = new Array<{ index: number; score: number }>(
      this.numberOfPois
    )
      .fill({ index: 0, score: 0 })
      .map((_, i) => ({ index: i, score: 0 }));
    // poiScores = M @ weights
    for (let i = 0; i < this.numberOfPois; i++) {
      let score = 0;
      for (let j = 0; j < M.length; j++) {
        score += M[j][i] * this.weights[j];
      }
      poiScores[i].score = score;
    }

    return poiScores;
  }
}

export function computePoiPopularity(
  reviews: {
    poiId: number;
    numberOfReviews: number;
    likesProportion: number;
  }[]
) {
  if (reviews.length === 0) {
    return new Map<
      number,
      {
        numberOfReviews: number;
        likesProportion: number;
        popularityScore: number;
      }
    >();
  }
  const highestReviews = Math.max(
    ...reviews.map((review) => review.numberOfReviews)
  );
  const maxLogNormalizedNumberOfReviews = Math.log2(1 + highestReviews);
  // Log normalize the number of reviews.
  const logNormalizedNumberOfReviews = reviews.map((review) => {
    if (review.numberOfReviews === 0) {
      return 0;
    }
    return (
      Math.log2(review.numberOfReviews + 1) / maxLogNormalizedNumberOfReviews
    );
  });
  const likesProportion = reviews.map((review) => {
    if (review.numberOfReviews === 0) {
      return 0;
    }
    return review.likesProportion / review.numberOfReviews;
  });
  return new Map(
    reviews.map((review, index) => {
      const popularityScore =
        logNormalizedNumberOfReviews[index] * 0.7 +
        likesProportion[index] * 0.3;
      return [
        review.poiId,
        {
          numberOfReviews: logNormalizedNumberOfReviews[index],
          likesProportion: likesProportion[index],
          popularityScore,
        },
      ];
    })
  );
}

async function searchPOIS(
  input: {
    showVisited: boolean;
    showUnvisited: boolean;
    excludedTags: number[];
    recommendFromLocation?: {
      latitude: number;
      longitude: number;
    };
    recommendRadius: number;
  },
  ctx: { auth: { userId: string | null } }
) {
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
    const recommendationRadius = input.recommendRadius / 111.32;
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
    const tagCounts = await db
      .select({
        tagId: poiTagTable.tagId,
        count: sql<number>`COUNT(*)`.as("count"),
      })
      .from(poiTagTable)
      .groupBy(poiTagTable.tagId);
    const tagCountMap = new Map<number, number>();
    for (const tag of tagCounts) {
      tagCountMap.set(tag.tagId, tag.count);
    }
    const tagsCounted = tags.map((tag) => ({
      ...tag,
      count: tagCountMap.get(tag.id) ?? 0,
    }));
    return tagsCounted;
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
      const pois = await searchPOIS({ ...input, recommendRadius: 5 }, ctx);
      const reviews = await db
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
        .groupBy(reviewTable.poiId);
      const poiPopularity = computePoiPopularity(reviews);
      return pois.map((poi) => ({
        ...poi,
        popularityScore: poiPopularity.get(poi.id)?.popularityScore ?? 0,
      }));
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
        recommendRadius: z.number().default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const [tags, allPois, userPreferences] = await Promise.all([
        db
          .select({
            id: tagTable.id,
            name: tagTable.name,
          })
          .from(tagTable),
        searchPOIS(
          {
            ...input,
            recommendFromLocation: undefined,
          },
          ctx
        ),
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

      const recommendationRadius = input.recommendRadius / 111.32;
      const pois: typeof allPois = [];
      for (const poi of allPois) {
        // Check if poi is within radius.
        if (
          poi.pos.latitude >=
            input.recommendFromLocation.latitude - recommendationRadius &&
          poi.pos.latitude <=
            input.recommendFromLocation.latitude + recommendationRadius &&
          poi.pos.longitude >=
            input.recommendFromLocation.longitude - recommendationRadius &&
          poi.pos.longitude <=
            input.recommendFromLocation.longitude + recommendationRadius
        ) {
          pois.push(poi);
        }
      }

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

      const recommendationEngine = new RecommendationEngine(tags, pois);
      recommendationEngine.setPoiTags(poiTags);
      recommendationEngine.setNumberOfPoiReviews(poiReviews);
      recommendationEngine.setPoiLikesProportion(poiReviews);
      const poiScores = recommendationEngine.recommend(userPreferences);

      const poiPopularity = computePoiPopularity(poiReviews);
      const top5 = poiScores.sort((a, b) => b.score - a.score).slice(0, 5);
      const recommended = top5.map((poi) => ({
        ...pois[poi.index],
        popularityScore:
          poiPopularity.get(pois[poi.index].id)?.popularityScore ?? 0,
      }));
      const recommendedPoiIds = new Set(recommended.map((poi) => poi.id));
      return {
        recommended,
        others: allPois
          .filter((poi) => !recommendedPoiIds.has(poi.id))
          .map((poi) => {
            return {
              ...poi,
              popularityScore: 0,
            };
          }),
      };
    }),
  createPOI: protectedProcedure
    .input(
      z.object({
        address: z.string().max(255),
        lat: z.number(),
        lng: z.number(),
        name: z.string().max(255),
        description: z.string().max(255),
        images: z.array(z.string()),
        tags: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Use transaction so that if either insert fails, the other insert is rolled back.
      const transaction = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(poiTable)
          .values({
            name: input.name,
            description: input.description,
            latitude: input.lat.toString(),
            longitude: input.lng.toString(),
            address: input.address,
            openingHours: null,
            uploaderId: userId,
          })
          .returning({ id: poiTable.id });
        const poiId = inserted[0]?.id;
        if (input.images.length > 0) {
          await tx.insert(poiImagesTable).values(
            input.images.map((image) => ({
              poiId: poiId,
              imageUrl: image,
              uploaderId: userId,
            }))
          );
        }
        if (input.tags.length > 0) {
          await tx.insert(poiTagTable).values(
            input.tags.map((tagId) => ({
              tagId: tagId,
              poiId: poiId,
            }))
          );
        }
        return poiId;
      });
      return { id: transaction };
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
  uploadPOIImage: protectedProcedure
    .input(
      z.object({
        poiId: z.number(),
        name: z.string().max(255),
        images: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      if (input.images.length > 0) {
        await db.insert(poiImagesTable).values(
          input.images.map((image) => ({
            poiId: input.poiId,
            imageUrl: image,
            uploaderId: userId,
          }))
        );
      }
    }),
  getPOIImages: publicProcedure
    .input(z.object({ poiId: z.number() }))
    .query(async ({ input }) => {
      const images = await db
        .select({
          imageUrl: poiImagesTable.imageUrl,
          uploaderId: poiImagesTable.uploaderId,
          creationDate: poiImagesTable.createdAt,
        })
        .from(poiImagesTable)
        .where(eq(poiImagesTable.poiId, input.poiId));

      const uploaderIds = [
        ...new Set(images.map((imgData) => imgData.uploaderId)),
      ]; //deduplicated user ids list

      const nonNullUploaderIds = uploaderIds.filter(
        (id) => id !== null && id !== "" && id !== undefined
      ) as string[];

      const users = await clerkClient.users.getUserList({
        userId: nonNullUploaderIds,
        limit: nonNullUploaderIds.length,
      });

      const uploaderMap = new Map<
        string,
        {
          username: string;
          imageUrl: string;
        }
      >();
      for (const user of users.data) {
        uploaderMap.set(user.id, {
          username:
            user.username ?? user.firstName ?? user.lastName ?? "Unknown",
          imageUrl: user.imageUrl,
        });
      }

      return {
        images: images.map((imgData) => {
          if (imgData.uploaderId === null) {
            return {
              ...imgData,
              uploader: null,
            };
          }
          return {
            ...imgData,
            uploader: uploaderMap.get(imgData.uploaderId) ?? null,
          };
        }),
      };
    }),
  getPOITags: publicProcedure
    .input(
      z.object({
        poiId: z.number(),
        // excludedTags: z.array(z.number()),
        // tagIdOrder: z.array(z.number()),
      })
    )
    .query(async ({ input }) => {
      const tags = await db
        .select({
          name: tagTable.name,
          tagId: poiTagTable.tagId,
        })
        .from(poiTagTable)
        .innerJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
        .where(eq(poiTagTable.poiId, input.poiId));
      return tags;
    }),
  getAddress: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(async ({ input }) => {
      const token = env.NEXT_PUBLIC_MAPBOX_PK;
      const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${input.lng}&latitude=${input.lat}&access_token=${token}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Mapbox API error: ${response.statusText}`);
        }
        const data = await response.json(); //this data is kinda hard to validate...
        const place =
          data?.features?.[0]?.properties?.name_preferred || "Unknown location";
        return place;
      } catch (error) {
        console.error("Reverse geocoding error:", error);
        throw new Error("Failed to fetch reverse geocode data");
      }
    }),
});

/*
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "dXJuOm1ieGFkcjo4NTA4ODFhOS1lZjY1LTRkMTUtOWQyYS1kNmY0MTllZmJlMDI",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -73.988939,
          40.73295
        ]
      },
      "properties": {
        "mapbox_id": "dXJuOm1ieGFkcjo4NTA4ODFhOS1lZjY1LTRkMTUtOWQyYS1kNmY0MTllZmJlMDI",
        "feature_type": "address",
        "full_address": "120 East 13th Street, New York, New York 10003, United States",
        "name": "120 East 13th Street",
        "name_preferred": "120 East 13th Street",
        "coordinates": {
          "longitude": -73.988939,
          "latitude": 40.73295,
          "accuracy": "rooftop",
          "routable_points": [
            {
              "name": "default",
              "latitude": 40.7331,
              "longitude": -73.98883
            }
          ]
        },
        "place_formatted": "New York, New York 10003, United States",
        "context": {
          "address": {
            "mapbox_id": "dXJuOm1ieGFkcjo4NTA4ODFhOS1lZjY1LTRkMTUtOWQyYS1kNmY0MTllZmJlMDI",
            "address_number": "120",
            "street_name": "East 13th Street",
            "name": "120 East 13th Street"
          },
          "street": {
            "mapbox_id": "dXJuOm1ieGFkci1zdHI6ODUwODgxYTktZWY2NS00ZDE1LTlkMmEtZDZmNDE5ZWZiZTAy",
            "name": "East 13th Street"
          },
          "neighborhood": {
            "mapbox_id": "dXJuOm1ieHBsYzpDeWFNN0E",
            "name": "East Village",
            "wikidata_id": "Q1043326",
            "alternate": {
              "mapbox_id": "dXJuOm1ieHBsYzpEd1dNN0E",
              "name": "Gramercy-Flatiron"
            }
          },
          "postcode": {
            "mapbox_id": "postcode.5479128183176630",
            "name": "10003"
          },
          "locality": {
            "mapbox_id": "dXJuOm1ieHBsYzpGREtLN0E",
            "name": "Manhattan",
            "wikidata_id": "Q11299"
          },
          "place": {
            "mapbox_id": "dXJuOm1ieHBsYzpEZTVJN0E",
            "name": "New York",
            "wikidata_id": "Q60"
          },
          "district": {
            "mapbox_id": "dXJuOm1ieHBsYzpBUU5tN0E",
            "name": "New York County",
            "wikidata_id": "Q500416"
          },
          "region": {
            "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
            "name": "New York",
            "wikidata_id": "Q1384",
            "region_code": "NY",
            "region_code_full": "US-NY"
          },
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "wikidata_id": "Q30",
            "country_code": "US",
            "country_code_alpha_3": "USA"
          }
        }
      }
    },
    {
      "type": "Feature",
      "id": "dXJuOm1ieHBsYzpDeWFNN0E",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -73.98766,
          40.728603
        ]
      },
      "properties": {
        "mapbox_id": "dXJuOm1ieHBsYzpDeWFNN0E",
        "feature_type": "neighborhood",
        "full_address": "East Village, New York, New York, United States",
        "name": "East Village",
        "name_preferred": "East Village",
        "coordinates": {
          "longitude": -73.98766,
          "latitude": 40.728603
        },
        "place_formatted": "New York, New York, United States",
        "bbox": [
          -73.991921,
          40.725204,
          -73.982558,
          40.734798
        ],
        "context": {
          "postcode": {
            "mapbox_id": "postcode.5479128183176630",
            "name": "10003"
          },
          "locality": {
            "mapbox_id": "dXJuOm1ieHBsYzpGREtLN0E",
            "name": "Manhattan",
            "wikidata_id": "Q11299"
          },
          "place": {
            "mapbox_id": "dXJuOm1ieHBsYzpEZTVJN0E",
            "name": "New York",
            "wikidata_id": "Q60"
          },
          "district": {
            "mapbox_id": "dXJuOm1ieHBsYzpBUU5tN0E",
            "name": "New York County",
            "wikidata_id": "Q500416"
          },
          "region": {
            "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
            "name": "New York",
            "wikidata_id": "Q1384",
            "region_code": "NY",
            "region_code_full": "US-NY"
          },
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "wikidata_id": "Q30",
            "country_code": "US",
            "country_code_alpha_3": "USA"
          },
          "neighborhood": {
            "mapbox_id": "dXJuOm1ieHBsYzpDeWFNN0E",
            "name": "East Village",
            "wikidata_id": "Q1043326"
          }
        }
      }
    },
    {
      "type": "Feature",
      "id": "postcode.5479128183176630",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -73.98466,
          40.73122
        ]
      },
      "properties": {
        "mapbox_id": "postcode.5479128183176630",
        "feature_type": "postcode",
        "full_address": "New York, New York 10003, United States",
        "name": "10003",
        "name_preferred": "10003",
        "coordinates": {
          "longitude": -73.98466,
          "latitude": 40.73122
        },
        "place_formatted": "New York, New York, United States",
        "context": {
          "locality": {
            "mapbox_id": "dXJuOm1ieHBsYzpGREtLN0E",
            "name": "Manhattan",
            "wikidata_id": "Q11299"
          },
          "place": {
            "mapbox_id": "dXJuOm1ieHBsYzpEZTVJN0E",
            "name": "New York",
            "wikidata_id": "Q60"
          },
          "district": {
            "mapbox_id": "dXJuOm1ieHBsYzpBUU5tN0E",
            "name": "New York County",
            "wikidata_id": "Q500416"
          },
          "region": {
            "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
            "name": "New York",
            "wikidata_id": "Q1384",
            "region_code": "NY",
            "region_code_full": "US-NY"
          },
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "wikidata_id": "Q30",
            "country_code": "US",
            "country_code_alpha_3": "USA"
          },
          "postcode": {
            "mapbox_id": "postcode.5479128183176630",
            "name": "10003"
          }
        }
      }
    },
    {
      "type": "Feature",
      "id": "dXJuOm1ieHBsYzpGREtLN0E",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -73.95709,
          40.789352
        ]
      },
      "properties": {
        "mapbox_id": "dXJuOm1ieHBsYzpGREtLN0E",
        "feature_type": "locality",
        "full_address": "Manhattan, New York, United States",
        "name": "Manhattan",
        "name_preferred": "Manhattan",
        "coordinates": {
          "longitude": -73.95709,
          "latitude": 40.789352
        },
        "place_formatted": "New York, United States",
        "bbox": [
          -74.04737,
          40.681267,
          -73.907,
          40.882075
        ],
        "context": {
          "place": {
            "mapbox_id": "dXJuOm1ieHBsYzpEZTVJN0E",
            "name": "New York",
            "wikidata_id": "Q60"
          },
          "district": {
            "mapbox_id": "dXJuOm1ieHBsYzpBUU5tN0E",
            "name": "New York County",
            "wikidata_id": "Q500416"
          },
          "region": {
            "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
            "name": "New York",
            "wikidata_id": "Q1384",
            "region_code": "NY",
            "region_code_full": "US-NY"
          },
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "wikidata_id": "Q30",
            "country_code": "US",
            "country_code_alpha_3": "USA"
          },
          "locality": {
            "mapbox_id": "dXJuOm1ieHBsYzpGREtLN0E",
            "name": "Manhattan",
            "wikidata_id": "Q11299"
          }
        }
      }
    },
    {
      "type": "Feature",
      "id": "dXJuOm1ieHBsYzpEZTVJN0E",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -74.005994,
          40.712749
        ]
      },
      "properties": {
        "mapbox_id": "dXJuOm1ieHBsYzpEZTVJN0E",
        "feature_type": "place",
        "full_address": "New York, New York, United States",
        "name": "New York",
        "name_preferred": "New York",
        "coordinates": {
          "longitude": -74.005994,
          "latitude": 40.712749
        },
        "place_formatted": "New York, United States",
        "bbox": [
          -74.259633,
          40.477399,
          -73.700292,
          40.917577
        ],
        "context": {
          "district": {
            "mapbox_id": "dXJuOm1ieHBsYzpBUU5tN0E",
            "name": "New York County",
            "wikidata_id": "Q500416"
          },
          "region": {
            "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
            "name": "New York",
            "wikidata_id": "Q1384",
            "region_code": "NY",
            "region_code_full": "US-NY"
          },
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "wikidata_id": "Q30",
            "country_code": "US",
            "country_code_alpha_3": "USA"
          },
          "place": {
            "mapbox_id": "dXJuOm1ieHBsYzpEZTVJN0E",
            "name": "New York",
            "wikidata_id": "Q60"
          }
        }
      }
    },
    {
      "type": "Feature",
      "id": "dXJuOm1ieHBsYzpBUU5tN0E",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -73.985245,
          40.744633
        ]
      },
      "properties": {
        "mapbox_id": "dXJuOm1ieHBsYzpBUU5tN0E",
        "feature_type": "district",
        "full_address": "New York County, New York, United States",
        "name": "New York County",
        "name_preferred": "New York County",
        "coordinates": {
          "longitude": -73.985245,
          "latitude": 40.744633
        },
        "place_formatted": "New York, United States",
        "bbox": [
          -74.05179,
          40.669244,
          -73.907007,
          40.885322
        ],
        "context": {
          "region": {
            "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
            "name": "New York",
            "wikidata_id": "Q1384",
            "region_code": "NY",
            "region_code_full": "US-NY"
          },
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "wikidata_id": "Q30",
            "country_code": "US",
            "country_code_alpha_3": "USA"
          },
          "district": {
            "mapbox_id": "dXJuOm1ieHBsYzpBUU5tN0E",
            "name": "New York County",
            "wikidata_id": "Q500416"
          }
        }
      }
    },
    {
      "type": "Feature",
      "id": "dXJuOm1ieHBsYzpBYVRz",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -75.465247,
          42.751211
        ]
      },
      "properties": {
        "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
        "feature_type": "region",
        "full_address": "New York, United States",
        "name": "New York",
        "name_preferred": "New York",
        "coordinates": {
          "longitude": -75.465247,
          "latitude": 42.751211
        },
        "place_formatted": "United States",
        "bbox": [
          -79.763007,
          40.462666,
          -71.781689,
          45.0217
        ],
        "context": {
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "wikidata_id": "Q30",
            "country_code": "US",
            "country_code_alpha_3": "USA"
          },
          "region": {
            "mapbox_id": "dXJuOm1ieHBsYzpBYVRz",
            "name": "New York",
            "region_code": "NY",
            "region_code_full": "US-NY",
            "wikidata_id": "Q1384"
          }
        }
      }
    },
    {
      "type": "Feature",
      "id": "dXJuOm1ieHBsYzpJdXc",
      "geometry": {
        "type": "Point",
        "coordinates": [
          -97.922211,
          39.381266
        ]
      },
      "properties": {
        "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
        "feature_type": "country",
        "full_address": "United States",
        "name": "United States",
        "name_preferred": "United States",
        "coordinates": {
          "longitude": -97.922211,
          "latitude": 39.381266
        },
        "bbox": [
          -179.9,
          18.829161,
          -66.902733,
          71.420291
        ],
        "context": {
          "country": {
            "mapbox_id": "dXJuOm1ieHBsYzpJdXc",
            "name": "United States",
            "country_code": "US",
            "country_code_alpha_3": "USA",
            "wikidata_id": "Q30"
          }
        }
      }
    }
  ],
  "attribution": "NOTICE: © 2025 Mapbox and its suppliers. All rights reserved. Use of this data is subject to the Mapbox Terms of Service (https://www.mapbox.com/about/maps/). This response and the information it contains may not be retained."
}
*/
