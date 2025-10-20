import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import {
  itineraryPOITable,
  itineraryTable,
  poiTable,
  reviewTable,
} from "@/db/schema";
import { and, eq, exists, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// TODO: Currently, the POI is hardcoded. Create a trpc router that interacts with the database to get the POI.
const itinerary = {
  id: 1,
  name: "Itinerary 1",
  pois: [
    {
      id: 10,
      name: "Place 1",
      checked: true,
      orderPriority: 1,
    },
    {
      id: 20,
      name: "Place 2",
      checked: true,
      orderPriority: 2,
    },
    {
      id: 30,
      name: "Place 3",
      checked: false,
      orderPriority: 3,
    },
    {
      id: 40,
      name: "Place 4",
      checked: true,
      orderPriority: 4,
    },
    {
      id: 50,
      name: "Place 5",
      checked: true,
      orderPriority: 5,
    },
  ],
};

const itineraries = [
  {
    id: 1,
    name: "Itinerary 1",
  },
  {
    id: 2,
    name: "Itinerary 2",
  },
];

export const itineraryRouter = createTRPCRouter({
  getAllItineraries: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.auth.userId;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Get all itineraries for the current user
    const userItineraries = await db
      .select({
        id: itineraryTable.id,
        name: itineraryTable.name,
      })
      .from(itineraryTable)
      .where(eq(itineraryTable.userId, userId));

    return userItineraries;
  }),

  createItinerary: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Itinerary name is required").max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Insert new itinerary into database
      const [newItinerary] = await db
        .insert(itineraryTable)
        .values({
          name: input.name,
          userId: userId,
        })
        .returning({
          id: itineraryTable.id,
          name: itineraryTable.name,
        });

      return newItinerary;
    }),

  addPOIToItinerary: protectedProcedure
    .input(
      z.object({
        itineraryId: z.number(),
        poiId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Verify the itinerary belongs to the user
      const itinerary = await db
        .select()
        .from(itineraryTable)
        .where(
          and(
            eq(itineraryTable.id, input.itineraryId),
            eq(itineraryTable.userId, userId)
          )
        )
        .limit(1);

      if (itinerary.length === 0) {
        throw new Error("Itinerary not found or access denied");
      }

      // Get the highest order priority in this itinerary
      const maxOrderResult = await db
        .select({
          maxOrder: sql<number>`COALESCE(MAX(${itineraryPOITable.orderPriority}), 0)`,
        })
        .from(itineraryPOITable)
        .where(eq(itineraryPOITable.itineraryId, input.itineraryId));

      const nextOrder = (maxOrderResult[0]?.maxOrder ?? 0) + 1;

      // Insert POI into itinerary (use INSERT ON CONFLICT to handle duplicates)
      try {
        const [newItineraryPOI] = await db
          .insert(itineraryPOITable)
          .values({
            itineraryId: input.itineraryId,
            poiId: input.poiId,
            orderPriority: nextOrder,
            checked: false,
          })
          .returning();

        return newItineraryPOI;
      } catch (error) {
        // Handle duplicate entry (POI already in itinerary)
        throw new Error("POI is already in this itinerary");
      }
    }),

  getItinerary: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      // First verify the itinerary belongs to the user
      const itinerary = await db
        .select({
          id: itineraryTable.id,
          name: itineraryTable.name,
        })
        .from(itineraryTable)
        .where(
          and(
            eq(itineraryTable.id, input.id),
            eq(itineraryTable.userId, userId)
          )
        )
        .limit(1);

      if (itinerary.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Itinerary not found",
        });
      }

      // Get POIs in the itinerary with their details, sorted by order priority
      const itineraryPOIs = await db
        .select({
          id: itineraryPOITable.poiId,
          name: sql<string>`${poiTable.name}`,
          checked: itineraryPOITable.checked,
          orderPriority: itineraryPOITable.orderPriority,
          longitude: sql<number>`CAST(${poiTable.longitude} AS numeric)`,
          latitude: sql<number>`CAST(${poiTable.latitude} AS numeric)`,
        })
        .from(itineraryPOITable)
        .innerJoin(poiTable, eq(poiTable.id, itineraryPOITable.poiId))
        .where(eq(itineraryPOITable.itineraryId, input.id))
        .orderBy(itineraryPOITable.orderPriority);

      return {
        id: itinerary[0].id,
        name: itinerary[0].name,
        pois: itineraryPOIs,
      };
    }),
  updateItineraryPOIOrder: protectedProcedure
    .input(
      z.object({
        itineraryId: z.number(),
        pois: z.array(
          z.object({
            id: z.number(),
            orderPriority: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // Verify the itinerary belongs to the user
      const itinerary = await db
        .select()
        .from(itineraryTable)
        .where(
          and(
            eq(itineraryTable.id, input.itineraryId),
            eq(itineraryTable.userId, userId)
          )
        )
        .limit(1);

      if (itinerary.length === 0) {
        throw new Error("Itinerary not found or access denied");
      }

      // Update the order priorities of the POIs
      await Promise.all(
        input.pois.map((poi) =>
          db
            .update(itineraryPOITable)
            .set({ orderPriority: poi.orderPriority })
            .where(
              and(
                eq(itineraryPOITable.itineraryId, input.itineraryId),
                eq(itineraryPOITable.poiId, poi.id)
              )
            )
        )
      );

      // Return the updated itinerary
      const updatedPOIs = await db
        .select({
          id: itineraryPOITable.poiId,
          name: sql<string>`${poiTable.name}`,
          checked: itineraryPOITable.checked,
          orderPriority: itineraryPOITable.orderPriority,
          longitude: sql<number>`CAST(${poiTable.longitude} AS numeric)`,
          latitude: sql<number>`CAST(${poiTable.latitude} AS numeric)`,
        })
        .from(itineraryPOITable)
        .innerJoin(poiTable, eq(poiTable.id, itineraryPOITable.poiId))
        .where(eq(itineraryPOITable.itineraryId, input.itineraryId))
        .orderBy(itineraryPOITable.orderPriority);

      return {
        id: input.itineraryId,
        name: itinerary[0].name,
        pois: updatedPOIs,
      };
    }),
  updateItineraryPOI: protectedProcedure
    .input(
      z.object({
        itineraryId: z.number(),
        poiId: z.number(),
        checked: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(itineraryPOITable)
        .set({
          checked: input.checked,
        })
        .where(
          and(
            eq(itineraryPOITable.itineraryId, input.itineraryId),
            eq(itineraryPOITable.poiId, input.poiId),
            exists(
              db
                .select()
                .from(itineraryTable)
                .where(
                  and(
                    eq(itineraryTable.id, input.itineraryId),
                    // This is to make sure the user is the owner of the itinerary.
                    eq(itineraryTable.userId, ctx.auth.userId)
                  )
                )
            )
          )
        );

      // Return the associated review of this place for the user.
      // Will be used for the review modal.
      const review = await db
        .select()
        .from(reviewTable)
        .where(
          and(
            eq(reviewTable.poiId, input.poiId),
            eq(reviewTable.userId, ctx.auth.userId)
          )
        )
        .limit(1);
      if (review.length === 0) {
        return null;
      }
      return review[0];
    }),

  deleteItinerary: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;

      // First verify the itinerary belongs to the user
      const itinerary = await db
        .select()
        .from(itineraryTable)
        .where(
          and(
            eq(itineraryTable.id, input.id),
            eq(itineraryTable.userId, userId)
          )
        )
        .limit(1);

      if (itinerary.length === 0) {
        throw new Error("Itinerary not found or access denied");
      }

      // Delete all POIs associated with this itinerary first
      await db
        .delete(itineraryPOITable)
        .where(eq(itineraryPOITable.itineraryId, input.id));

      // Delete the itinerary
      await db.delete(itineraryTable).where(eq(itineraryTable.id, input.id));

      return { success: true };
    }),

  renameItinerary: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1, "Itinerary name is required").max(128),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Update the itinerary name (the WHERE clause ensures user ownership)
      const [updatedItinerary] = await db
        .update(itineraryTable)
        .set({
          name: input.name,
        })
        .where(
          and(
            eq(itineraryTable.id, input.id),
            eq(itineraryTable.userId, userId)
          )
        )
        .returning({
          id: itineraryTable.id,
          name: itineraryTable.name,
        });

      if (!updatedItinerary) {
        throw new Error("Itinerary not found or access denied");
      }

      return updatedItinerary;
    }),

  removePOIFromItinerary: protectedProcedure
    .input(
      z.object({
        itineraryId: z.number(),
        poiId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Verify the itinerary belongs to the user and the POI exists in the itinerary
      const itineraryPOI = await db
        .select({
          itineraryId: itineraryPOITable.itineraryId,
          poiId: itineraryPOITable.poiId,
          orderPriority: itineraryPOITable.orderPriority,
        })
        .from(itineraryPOITable)
        .innerJoin(
          itineraryTable,
          eq(itineraryPOITable.itineraryId, itineraryTable.id)
        )
        .where(
          and(
            eq(itineraryPOITable.itineraryId, input.itineraryId),
            eq(itineraryPOITable.poiId, input.poiId),
            eq(itineraryTable.userId, userId)
          )
        )
        .limit(1);

      if (itineraryPOI.length === 0) {
        throw new Error("POI not found in itinerary or access denied");
      }

      const removedOrderPriority = itineraryPOI[0].orderPriority;

      // Delete the POI from the itinerary
      await db
        .delete(itineraryPOITable)
        .where(
          and(
            eq(itineraryPOITable.itineraryId, input.itineraryId),
            eq(itineraryPOITable.poiId, input.poiId)
          )
        );

      // Update order priorities of remaining POIs to fill the gap
      await db
        .update(itineraryPOITable)
        .set({
          orderPriority: sql`${itineraryPOITable.orderPriority} - 1`,
        })
        .where(
          and(
            eq(itineraryPOITable.itineraryId, input.itineraryId),
            sql`${itineraryPOITable.orderPriority} > ${removedOrderPriority}`
          )
        );

      return { success: true };
    }),
});
