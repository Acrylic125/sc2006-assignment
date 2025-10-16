import z from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { db } from "@/db";
import { userSurpriseMePreferencesTable } from "@/db/schema";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";

export const experimentalRouter = createTRPCRouter({
  indicatePreference: publicProcedure
    .input(
      z.object({
        poiId: z.number(),
        liked: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const c = await cookies();

      // Prefer authenticated Clerk user id, fallback to cookie-based fakeUserId
      const fakeUserId = c.get("fakeUserId")?.value;
      const effectiveUserId = ctx.auth?.userId ?? fakeUserId;
      if (!effectiveUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No user id available",
        });
      }
      await db
        .insert(userSurpriseMePreferencesTable)
        .values({
          poiId: input.poiId,
          liked: input.liked,
          userId: effectiveUserId,
        })
        .onConflictDoUpdate({
          target: [
            userSurpriseMePreferencesTable.userId,
            userSurpriseMePreferencesTable.poiId,
          ],
          set: {
            liked: input.liked,
          },
        });
    }),
  // Log tag weights sent from client for server-side terminal output
  logTagWeights: publicProcedure
    .input(z.record(z.string(), z.number()))
    .mutation(async ({ input }) => {
      try {
        console.log("SurpriseMe tag weights (server):", input);
      } catch (e) {
        console.error("Failed to log tag weights on server:", e);
      }
      return { ok: true };
    }),
});
