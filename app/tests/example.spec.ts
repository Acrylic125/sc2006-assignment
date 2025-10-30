import { test, expect } from "@playwright/test";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { poiTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const db = drizzle.mock({ schema: schema });

// test("has title", async ({ page }) => {
//   await page.goto("https://playwright.dev/");

//   // Expect a title "to contain" a substring.
//   await expect(page).toHaveTitle(/Playwright/);
// });

// test("get started link", async ({ page }) => {
//   await page.goto("https://playwright.dev/");

//   // Click the get started link.
//   await page.getByRole("link", { name: "Get started" }).click();

//   // Expects page to have a heading with the name of Installation.
//   await expect(
//     page.getByRole("heading", { name: "Installation" })
//   ).toBeVisible();
// });

// test("test", async ({ page }) => {
//   await page.goto("http://localhost:3000/");
//   await page.getByRole("region", { name: "Map" }).click({
//     position: {
//       x: 784,
//       y: 194,
//     },
//   });
//   await page.getByRole("button", { name: "Itinerary", exact: true }).click();
//   await page.getByRole("button", { name: "Place" }).click();
//   await page.getByRole("link", { name: "Navigate" }).click();
// });

test("test 2", async () => {
  await db.insert(poiTable).values({
    name: "Test POI",
    description: "Test Description",
    latitude: "0",
    longitude: "0",
    address: "Test Address",
    openingHours: "Test Opening Hours",
    uploaderId: "test_user_id",
  });
  const poi = await db
    .select()
    .from(poiTable)
    .where(eq(poiTable.name, "Test POI"));
  expect(poi).toEqual([
    {
      id: 1,
      name: "Test POI",
      description: "Test Description",
      latitude: "0",
      longitude: "0",
    },
  ]);
});
