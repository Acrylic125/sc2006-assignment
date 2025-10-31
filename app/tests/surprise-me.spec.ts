// @vitest-environment node
import { appRouter } from "@/server/router";
import { describe, expect, it } from "vitest";
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

  it("should allow user to reindicate preferences, overriding previous preferences", async () => {
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

  it("should error if recommend radius is smaller than 0", async () => {
    const caller = createCaller();
    await expect(
      caller.map.recommend({
        showVisited: true,
        showUnvisited: true,
        excludedTags: [],
        recommendFromLocation: {
          latitude: 3 / 111.32,
          longitude: 3 / 111.32,
        },
        recommendRadius: -1,
      })
    ).rejects.toThrow();
  });

  it("should recommend 5 POIs, based on preferences", async () => {
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
        latitude: 3 / 111.32,
        longitude: 3 / 111.32,
      },
      recommendRadius: 5,
    });
    expect(result.recommended.length).toBe(5);
    // Should recommend 0-3, and ANY of 8-11.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    for (const poiId of [0, 1, 2, 3]) {
      expect(recommendedPoiIds.includes(poiId)).toBe(true);
    }
    expect(recommendedPoiIds.some((id) => id >= 8 && id <= 11)).toBe(true);
  });

  it("should recommend 5 POIs, despite disliking all POIs", async () => {
    const caller = createCaller();
    const preferences = [
      { poiId: 0, liked: false },
      { poiId: 1, liked: false },
      { poiId: 2, liked: false },
      { poiId: 3, liked: false },
      { poiId: 4, liked: false },
      { poiId: 5, liked: false },
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
    const result = await caller.map.recommend({
      showVisited: true,
      showUnvisited: true,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 3 / 111.32,
        longitude: 3 / 111.32,
      },
      recommendRadius: 5,
    });
    expect(result.recommended.length).toBe(5);
    // Should recommend ANY of 0-11.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    expect(recommendedPoiIds.every((id) => id >= 0 && id <= 11)).toBe(true);
  });

  it("should recommend 5 POIs, but not recommend excluded POIS with tag 0 (Most preferred)", async () => {
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
      excludedTags: [0],
      recommendFromLocation: {
        latitude: 3 / 111.32,
        longitude: 3 / 111.32,
      },
      recommendRadius: 5,
    });
    expect(result.recommended.length).toBe(5);
    // Should recommend 8-11, and ANY of 4-7.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    for (const poiId of [8, 9, 10, 11]) {
      expect(recommendedPoiIds.includes(poiId)).toBe(true);
    }
    expect(recommendedPoiIds.some((id) => id >= 4 && id <= 7)).toBe(true);
  });

  it("should recommend 5 POIs based on number of reviews (popularity)", async () => {
    const caller = createCaller();
    await caller.pois.indicatePreference({
      preferences: [], // Make sure no preferences are set.
      removeOld: true,
    });
    const result = await caller.map.recommend({
      showVisited: true,
      showUnvisited: true,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 1,
        longitude: 1,
      },
      recommendRadius: 5,
      options: {
        // Force factor that number of reviews is the only factor.
        weights: [0, 1, 0],
      },
    });
    expect(result.recommended.length).toBe(5);
    // Should recommend 12-16, based on number of reviews.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    for (const poiId of [12, 13, 14, 15, 16]) {
      expect(recommendedPoiIds.includes(poiId)).toBe(true);
    }
  });

  it("should recommend 5 POIs based on proportion of likes (favourability)", async () => {
    const caller = createCaller();
    await caller.pois.indicatePreference({
      preferences: [], // Make sure no preferences are set.
      removeOld: true,
    });
    const result = await caller.map.recommend({
      showVisited: true,
      showUnvisited: true,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 1,
        longitude: 1,
      },
      recommendRadius: 5,
      options: {
        // Force factor that proportion of likes is the only factor.
        weights: [0, 0, 1],
      },
    });
    expect(result.recommended.length).toBe(5);
    // Should recommend 12, 13, 14, 15, 17, based on proportion of likes.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    for (const poiId of [12, 13, 14, 15, 17]) {
      expect(recommendedPoiIds.includes(poiId)).toBe(true);
    }
  });

  it("should ONLY recommend visited POIs, within 5km of (0,0)", async () => {
    const caller = createCaller();
    await caller.pois.indicatePreference({
      preferences: [], // Make sure no preferences are set.
      removeOld: true,
    });
    const result = await caller.map.recommend({
      showVisited: true,
      showUnvisited: false,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 0,
        longitude: 0,
      },
      recommendRadius: 5,
    });
    expect(result.recommended.length).toBe(3);
    // Should recommend 1, 3, 5 based on proportion of likes.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    for (const poiId of [1, 3, 5]) {
      expect(recommendedPoiIds.includes(poiId)).toBe(true);
    }
  });

  it("should ONLY recommend unvisited POIs, within 5km of (0,0)", async () => {
    const caller = createCaller();
    await caller.pois.indicatePreference({
      preferences: [], // Make sure no preferences are set.
      removeOld: true,
    });
    const result = await caller.map.recommend({
      showVisited: false,
      showUnvisited: true,
      excludedTags: [],
      recommendFromLocation: {
        latitude: 0,
        longitude: 0,
      },
      recommendRadius: 5,
    });
    expect(result.recommended.length).toBe(3);
    // Should recommend 7, 9, 11 based on proportion of likes.
    const recommendedPoiIds = result.recommended.map((poi) => poi.id);
    for (const poiId of [7, 9, 11]) {
      expect(recommendedPoiIds.includes(poiId)).toBe(true);
    }
  });
});
