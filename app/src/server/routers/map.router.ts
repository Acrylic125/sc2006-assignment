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
import { currentUser } from '@clerk/nextjs/server';

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
      // poiPreferenceMatrix = poiTagMatrix @ poiUserPreferenceMatrix
      const poiPreferenceMatrix = new Array<number>(pois.length).fill(0);
      for (let i = 0; i < pois.length; i++) {
        let score = 0;
        for (let j = 0; j < tags.length; j++) {
          score += poiTagMatrix[i][j] * poiUserPreferenceMatrix[j];
        }
        poiPreferenceMatrix[i] = score;
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
  createPOI: protectedProcedure
      .input(
        z.object({
          address: z.string().max(255),
          lat: z.number(),
          lng: z.number(),
          name: z.string().max(255),
          description: z.string().max(255),
          images: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.auth.userId;
        const username = currentUser.name;
        console.log(username);
        console.log(input.address);
        console.log(input.lat);
        console.log(input.lng);
        console.log(input.name);
        console.log(input.description);
        console.log(input.images[0]);

        const poiId = Number(await db.insert(poiTable).values({
          name: input.name, 
          description: input.description, 
          latitude: input.lat.toString(), 
          longitude: input.lng.toString(),
          address: input.address,
          openingHours: null,
          uploaderId: userId,
          uploader: username,
        }).returning({id: poiTable.id}))
        for (const image of input.images) {
          db.insert(poiImagesTable).values({
            poiId: poiId,
            imageUrl: image,
            uploaderId: userId,
            uploader: username,
          })
        }
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
  getAddress: publicProcedure
    .input(z.object({lat: z.number(), lng: z.number()}))
    .query( async({input}) => {
      const token = env.NEXT_PUBLIC_MAPBOX_PK;
      const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${input.lng}&latitude=${input.lat}&access_token=${token}`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Mapbox API error: ${response.statusText}`);
        }
        const data = await response.json(); //this data is kinda hard to validate...
        const place = data?.features?.[0]?.properties?.name_preferred || 'Unknown location';
        return place;

      } catch (error) {
        console.error('Reverse geocoding error:', error);
        throw new Error('Failed to fetch reverse geocode data');
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