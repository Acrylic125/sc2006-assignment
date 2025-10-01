import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import { itineraryPOITable, itineraryTable, reviewTable } from "@/db/schema";
import { and, eq, exists } from "drizzle-orm";

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
    // TODO: Get all the itineraries from the database.
    return itineraries;
  }),
  getItinerary: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Get the itinerary from the database. MAKE SURE TO SORT THE POIS BY ORDER PRIORITY (in ascending order).
      //   db.select().from(itineraryPOITable).where...
      return itinerary;
    }),
  updateItineraryPOIOrder: protectedProcedure
    .input(
      z.object({
        itineraryId: z.number(),
        pois: z.array(
          z.object({
            id: z.number(), // Itinerary POI id
            orderPriority: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Update itineraryPOITable with the new order priority. Remember to update and return the updated itinerary.
      // See https://orm.drizzle.team/docs/update#with-update-clause
      //   db.update(itineraryPOITable)...

      // For now, we hardcode the itinerary.
      input.pois.forEach((poi) => {
        itinerary.pois.find((p) => p.id === poi.id)!.orderPriority =
          poi.orderPriority;
      });
      itinerary.pois.sort((a, b) => a.orderPriority - b.orderPriority);

      return itinerary;
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
});
