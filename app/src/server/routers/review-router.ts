import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";

export const reviewRouter = createTRPCRouter({
  getReviews: publicProcedure
    .input(
      z.object({
        itineraryId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Get the reviews from the database.
      //   db.select().from(reviewsTable).where...
      return [];
    }),
  createReview: protectedProcedure
    .input(
      z.object({
        poiId: z.number(),
        liked: z.boolean(),
        comment: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.userId;
      // TODO: Create a new review in the database.
      //   db.insert(reviewsTable)...
    }),
});
