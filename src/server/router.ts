import z from "zod";
import { createTRPCRouter, publicProcedure } from "./trpc";

export const appRouter = createTRPCRouter({
  userById: publicProcedure.input(z.string()).query(async (opts) => {}),
});

export type AppRouter = typeof appRouter;
