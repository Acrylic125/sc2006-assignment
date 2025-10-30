import { createCallerFactory } from "@/server/trpc";
import { appRouter } from "@/server/router";

describe("map router", () => {
  it("createPOI requires authntication", async () => {
    const createCaller = createCallerFactory(appRouter);
    // Use a minimal mocked context to avoid importing Next/Clerk in Jest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCaller({ auth: { userId: null } } as any);

    await expect(
      caller.map.createPOI({
        address: "123 Test St",
        lat: 1.23,
        lng: 4.56,
        name: "Test POI",
        description: "A place for testing",
        images: [],
        tags: [],
      })
    ).rejects.toHaveProperty("code", "UNAUTHORIZED");
  });
});
