import z from "zod";
import { createTRPCRouter, publicProcedure } from "./trpc";
import { itineraryRouter } from "./routers/itinerary-router";

export const appRouter = createTRPCRouter({
  itinerary: itineraryRouter,
});

export type AppRouter = typeof appRouter;
