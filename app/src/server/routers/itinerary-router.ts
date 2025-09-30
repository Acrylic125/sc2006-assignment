import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import { itineraryPOITable } from "@/db/schema";

// TODO: Currently, the POI is hardcoded. Create a trpc router that interacts with the database to get the POI.
const itinerary = {
  id: 1,
  name: "Itinerary 1",
  pois: [
    {
      id: 10,
      name: "Place 1",
      reviewed: true,
      orderPriority: 1,
    },
    {
      id: 20,
      name: "Place 2",
      reviewed: true,
      orderPriority: 2,
    },
    {
      id: 30,
      name: "Place 3",
      reviewed: false,
      orderPriority: 3,
    },
    {
      id: 40,
      name: "Place 4",
      reviewed: true,
      orderPriority: 4,
    },
    {
      id: 50,
      name: "Place 5",
      reviewed: true,
      orderPriority: 5,
    },
  ],
};

export const itineraryRouter = createTRPCRouter({
  getItinerary: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
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
});
