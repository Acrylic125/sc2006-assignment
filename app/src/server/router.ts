import z from "zod";
import { createTRPCRouter, publicProcedure } from "./trpc";
import { itineraryRouter } from "./routers/itinerary-router";
import { reviewRouter } from "./routers/review-router";

export const appRouter = createTRPCRouter({
  itinerary: itineraryRouter,
  review: reviewRouter,
});

export type AppRouter = typeof appRouter;
