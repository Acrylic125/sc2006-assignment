import { createTRPCRouter } from "./trpc";
import { itineraryRouter } from "./routers/itinerary-router";
import { reviewRouter } from "./routers/review-router";
import { mapRouter } from "./routers/map.router";
import { poisRouter } from "./routers/pois-router";

export const appRouter = createTRPCRouter({
  itinerary: itineraryRouter,
  review: reviewRouter,
  map: mapRouter,
  pois: poisRouter,
});

export type AppRouter = typeof appRouter;
