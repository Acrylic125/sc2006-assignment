// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createCallerFactory } from "@/server/trpc";
import { mapRouter } from "@/server/routers/map.router";

// Mock env BEFORE importing modules that read it
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    UPLOADTHING_TOKEN: "test-token",
    NEXT_PUBLIC_MAPBOX_PK: "pk.test",
  },
}));

// Mock the database layer used by getTags BEFORE importing the router
let selectCallCount = 0;
vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(() => {
        selectCallCount += 1;
        // First select().from(tagTable) → resolves to tags
        if (selectCallCount === 1) {
          return {
            from: vi.fn(async () => [{ id: 1, name: "Sample Tag" }]),
          };
        }
        // Second select().from(poiTagTable).groupBy(tagId) → resolves to counts
        return {
          from: vi.fn(() => ({
            groupBy: vi.fn(async () => [{ tagId: 1, count: 3 }]),
          })),
        };
      }),
    },
  };
});

// No need to mock schema; the mocked db ignores the table value

describe("mapRouter.getTags", () => {
  it("should return at least 1 tag", async () => {
    const createCaller = createCallerFactory(mapRouter);
    const caller = createCaller({
      auth: {
        userId: null,
      } as unknown as import("../src/server/context").Context["auth"],
    });

    const result = await caller.getTags();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    // Optional: validate shape
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("count");
  });
});
