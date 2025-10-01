import { createTRPCRouter } from "./trpc";
import { itineraryRouter } from "./routers/itinerary-router";
import { reviewRouter } from "./routers/review-router";
import { mapRouter } from "./routers/map.router";

export const appRouter = createTRPCRouter({
  itinerary: itineraryRouter,
  review: reviewRouter,
  map: mapRouter,
});

export type AppRouter = typeof appRouter;
