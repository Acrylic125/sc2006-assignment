// @vitest-environment node
import { appRouter } from "@/server/router";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { createCallerFactory } from "@/server/trpc";
import { db } from "@/db";
import { userSurpriseMePreferencesTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const TEST_USER_ID = "test-user";

function createCaller() {
  return createCallerFactory(appRouter)({
    auth: {
      userId: TEST_USER_ID,
    } as unknown as import("../src/server/context").Context["auth"],
  });
}

function createNotLoggedInCaller() {
  return createCallerFactory(appRouter)({
    auth: {
      userId: null,
    } as unknown as import("../src/server/context").Context["auth"],
  });
}

describe("When user accesses surprise me", () => {
  it("should not allow not logged in user to indicate preferences", async () => {
    const caller = createNotLoggedInCaller();
    await expect(
      caller.pois.indicatePreference({
        preferences: [],
        removeOld: true,
      })
    ).rejects.toThrow();
  });

  it("should allow user to indicate preferences", async () => {
    const caller = createCaller();
    const preferences = [
      { poiId: 0, liked: true },
      { poiId: 1, liked: true },
      { poiId: 2, liked: true },
      { poiId: 3, liked: true },
      { poiId: 4, liked: true },
      { poiId: 5, liked: true },
      { poiId: 6, liked: false },
      { poiId: 7, liked: false },
      { poiId: 8, liked: false },
      { poiId: 9, liked: false },
      { poiId: 10, liked: false },
      { poiId: 11, liked: false },
    ];
    await caller.pois.indicatePreference({
      preferences: preferences,
      removeOld: true,
    });
    const result = await db
      .select()
      .from(userSurpriseMePreferencesTable)
      .where(eq(userSurpriseMePreferencesTable.userId, TEST_USER_ID));
    expect(result.length).toBe(preferences.length);
    for (const preference of preferences) {
      expect(result.find((p) => p.poiId === preference.poiId)?.liked).toBe(
        preference.liked
      );
    }
  });

  it("should allow user to reindicate preferences", async () => {
    const caller = createCaller();
    const preferences = [
      { poiId: 0, liked: true },
      { poiId: 1, liked: true },
      { poiId: 2, liked: true },
      { poiId: 3, liked: true },
      { poiId: 4, liked: true },
      { poiId: 5, liked: true },
      { poiId: 6, liked: false },
      { poiId: 7, liked: false },
      { poiId: 8, liked: false },
      { poiId: 9, liked: false },
    ];
    await caller.pois.indicatePreference({
      preferences: preferences,
      removeOld: true,
    });
    const result = await db
      .select()
      .from(userSurpriseMePreferencesTable)
      .where(eq(userSurpriseMePreferencesTable.userId, TEST_USER_ID));
    expect(result.length).toBe(preferences.length);
    for (const preference of preferences) {
      expect(result.find((p) => p.poiId === preference.poiId)?.liked).toBe(
        preference.liked
      );
    }
  });
});
