// @vitest-environment node
import { appRouter } from "@/server/router";
import { describe, it, beforeAll, expect } from "vitest";
import { createCallerFactory } from "@/server/trpc";
import { db } from "@/db";
import { poiImagesTable, poiTagTable, poiTable } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

const TEST_USER_ID = "test-user";

function createCaller() {
  return createCallerFactory(appRouter)({
    auth: {
      userId: TEST_USER_ID,
    } as unknown as import("../src/server/context").Context["auth"],
  });
}

async function deleteAllTestUserPOIs() {
  // Find POIs uploaded by the test user
  const uploaded = await db
    .select({ id: poiTable.id })
    .from(poiTable)
    .where(eq(poiTable.uploaderId, TEST_USER_ID));
  const poiIds = uploaded.map((p) => p.id);
  if (poiIds.length === 0) return;
  // Delete dependant rows in child tables first
  await db.delete(poiImagesTable).where(inArray(poiImagesTable.poiId, poiIds));
  await db.delete(poiTagTable).where(inArray(poiTagTable.poiId, poiIds));
  // Finally delete the POIs
  await db.delete(poiTable).where(inArray(poiTable.id, poiIds));
}

describe("When user creates POIs", () => {
  beforeAll(async () => {
    await deleteAllTestUserPOIs();
  });

  it("should create a POI with valid input", async () => {
    const caller = createCaller();
    const input = {
      address: "test-address",
      name: "test-name",
      description: "a nice description",
      images: ["https://example.com", "http://example.com"],
      tags: [1, 2],
      lat: 50,
      lng: 50,
    };
    const result = await caller.map.createPOI(input);
    expect(typeof result.id).toBe("number");
    // Verify via select
    const rows = await db
      .select()
      .from(poiTable)
      .where(
        and(eq(poiTable.id, result.id), eq(poiTable.uploaderId, TEST_USER_ID))
      );
    expect(rows.length).toBe(1);
    expect(rows[0]?.name).toBe(input.name);
    expect(rows[0]?.address).toBe(input.address);
  });

  it("should error if address has only spaces", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "   ",
        name: "ok-name",
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if address length exceeds 255 characters", async () => {
    const caller = createCaller();
    const long = "a".repeat(256);
    await expect(
      caller.map.createPOI({
        address: long,
        name: "ok-name",
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if name has only spaces", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "   ",
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if name length exceeds 255 characters", async () => {
    const caller = createCaller();
    const long = "a".repeat(256);
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: long,
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if description length exceeds 255 characters", async () => {
    const caller = createCaller();
    const long = "a".repeat(256);
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: long,
        images: ["https://example.com"],
        tags: [1],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if images contain invalid URLs", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: "desc",
        images: ["hello-world", "nice"],
        tags: [1],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if images exceed 3 entries", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: "desc",
        images: [
          "https://example1.com",
          "https://example2.com",
          "https://example3.com",
          "https://example4.com",
          "https://example5.com",
          "https://example6.com",
        ],
        tags: [1],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if tags exceed 5 entries", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: "desc",
        images: ["https://example.com"],
        tags: [0, 1, 2, 3, 4, 5, 6],
        lat: 0,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if latitude < -90", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: -90.01,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if latitude > 90", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: 90.01,
        lng: 0,
      })
    ).rejects.toThrow();
  });

  it("should error if longitude < -180", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: 0,
        lng: -180.01,
      })
    ).rejects.toThrow();
  });

  it("should error if longitude > 180", async () => {
    const caller = createCaller();
    await expect(
      caller.map.createPOI({
        address: "ok-address",
        name: "ok-name",
        description: "desc",
        images: ["https://example.com"],
        tags: [1],
        lat: 0,
        lng: 180.01,
      })
    ).rejects.toThrow();
  });
});
