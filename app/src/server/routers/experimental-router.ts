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

      const fakeUserId = c.get("fakeUserId")?.value;
      if (!fakeUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fake user id",
        });
      }
      await db
        .insert(userSurpriseMePreferencesTable)
        .values({
          poiId: input.poiId,
          liked: input.liked,
          userId: fakeUserId,
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
});
