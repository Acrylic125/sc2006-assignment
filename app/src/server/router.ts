import { createTRPCRouter } from "./trpc";
import { itineraryRouter } from "./routers/itinerary-router";
import { reviewRouter } from "./routers/review-router";
import { mapRouter } from "./routers/map.router";
import { experimentalRouter } from "./routers/experimental-router";

export const appRouter = createTRPCRouter({
  itinerary: itineraryRouter,
  review: reviewRouter,
  map: mapRouter,
  experimental: experimentalRouter,
});

export type AppRouter = typeof appRouter;
