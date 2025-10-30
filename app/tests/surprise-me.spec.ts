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

  it("should recommend 5 POIs within a radius of 5km from (0,0)", async () => {
    const caller = createCaller();
    const preferences = [
      { poiId: 0, liked: true },
      { poiId: 1, liked: true },
      { poiId: 2, liked: true },
      { poiId: 3, liked: true },
      { poiId: 4, liked: true },
    ];
    await caller.pois.indicatePreference({
      preferences: preferences,
      removeOld: true,
    });
    const result = await caller.map.recommend({
      showVisited: true,
      showUnvisited: true,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 0,
        longitude: 0,
      },
      recommendRadius: 5,
    });
    expect(result.recommended.length).toBe(5);
    for (const poi of result.recommended) {
      const distance = Math.sqrt(
        Math.pow(poi.pos.latitude - 0, 2) + Math.pow(poi.pos.longitude - 0, 2)
      );
      expect(distance).toBeLessThanOrEqual(5);
    }
  });

  it("should recommend NO POIs within a radius of 5km from (100,100)", async () => {
    const caller = createCaller();
    const preferences = [
      { poiId: 0, liked: true },
      { poiId: 1, liked: true },
      { poiId: 2, liked: true },
      { poiId: 3, liked: true },
      { poiId: 4, liked: true },
    ];
    await caller.pois.indicatePreference({
      preferences: preferences,
      removeOld: true,
    });
    const result = await caller.map.recommend({
      showVisited: true,
      showUnvisited: true,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 100,
        longitude: 100,
      },
      recommendRadius: 5,
    });
    expect(result.recommended.length).toBe(0);
  });

  it("should recommend 5 POIs, based on preferences, within a radius of 5km from (3,3)", async () => {
    const caller = createCaller();
    const preferences = [
      // Tag 0 = 4
      { poiId: 0, liked: true },
      { poiId: 1, liked: true },
      { poiId: 2, liked: true },
      { poiId: 3, liked: true },
      // Tag 1 = -4
      { poiId: 4, liked: false },
      { poiId: 5, liked: false },
      { poiId: 6, liked: false },
      { poiId: 7, liked: false },
      // Tag 2 = 0
      { poiId: 8, liked: true },
      { poiId: 9, liked: true },
      { poiId: 10, liked: false },
      { poiId: 11, liked: false },
    ];
    await caller.pois.indicatePreference({
      preferences: preferences,
      removeOld: true,
    });
    const result = await caller.map.recommend({
      showVisited: true,
      showUnvisited: true,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 3,
        longitude: 3,
      },
      recommendRadius: 10000,
    });
    expect(result.recommended.length).toBe(5);
    // Should recommend 0-3, and ANY of 8-11.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    for (const poiId of [0, 1, 2, 3]) {
      expect(recommendedPoiIds.includes(poiId)).toBe(true);
    }
    console.log(recommendedPoiIds);
    expect(recommendedPoiIds.some((id) => id >= 8 && id <= 11)).toBe(true);
  });
});
