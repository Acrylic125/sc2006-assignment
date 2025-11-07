// "use client";

import { MainNavbar } from "@/components/navbar";
import { Survey } from "@/components/surprise-me/survey";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/db";
import { poiImagesTable, poiTable, poiTagTable, tagTable } from "@/db/schema";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { eq, exists, inArray, sql } from "drizzle-orm";

// interface POI {
//   id: number;
//   imageUrl: string;
//   name: string;
//   description: string;
//   latitude: string;
//   longitude: string;
//   tags: string[];
// }

export default async function SurpriseMePage() {
  const isAuthed = await auth();
  if (!isAuthed.userId) {
    return (
      <div className="w-full h-full flex flex-col items-center bg-background">
        <MainNavbar />
        <div className="h-96 flex flex-col items-center justify-center gap-8 px-8">
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <h1 className="text-3xl font-bold">Sign In Required</h1>
            <p className="text-muted-foreground max-w-md">
              You need to be signed in to use the Surprise Me feature. This
              helps us personalize your recommendations and save your liked
              places.
            </p>
          </div>
          <SignInButton />
        </div>
      </div>
    );
  }

  const pois = await db
    .select({
      id: poiTable.id,
      name: poiTable.name,
      description: poiTable.description,
      latitude: poiTable.latitude, // Include latitude
      longitude: poiTable.longitude, // Include longitude
      // tags: sql`array_agg(${tagTable.name})`.as("tags"),
    })
    .from(poiTable)
    .where(
      exists(
        db
          .select()
          .from(poiImagesTable)
          .where(eq(poiImagesTable.poiId, poiTable.id))
      )
    )
    // .leftJoin(poiImagesTable, eq(poiTable.id, poiImagesTable.poiId))
    // .leftJoin(poiTagTable, eq(poiTable.id, poiTagTable.poiId))
    // .leftJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
    // .where(sql`${poiImagesTable.imageUrl} IS NOT NULL`) // Ensure imageUrl is valid
    // .groupBy(poiTable.id, poiImagesTable.imageUrl)
    .orderBy(sql`RANDOM()`) // Randomize the POIs
    .limit(10);

  const [poiTags, poiImages] = await Promise.all([
    db
      .select({
        poiId: poiTagTable.poiId,
        tagName: tagTable.name,
      })
      .from(poiTagTable)
      .innerJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
      .where(
        inArray(
          poiTagTable.poiId,
          pois.map((poi) => poi.id)
        )
      ),
    db
      .select({
        poiId: poiImagesTable.poiId,
        imageUrl: poiImagesTable.imageUrl,
      })
      .from(poiImagesTable)
      .where(
        inArray(
          poiImagesTable.poiId,
          pois.map((poi) => poi.id)
        )
      ),
  ]);

  const poiImagesMap = new Map<number, string[]>();
  for (const image of poiImages) {
    poiImagesMap.set(image.poiId, [
      ...(poiImagesMap.get(image.poiId) ?? []),
      image.imageUrl,
    ]);
  }

  const poiTagsMap = new Map<number, string[]>();
  for (const tag of poiTags) {
    poiTagsMap.set(tag.poiId, [
      ...(poiTagsMap.get(tag.poiId) ?? []),
      tag.tagName,
    ]);
  }

  return (
    <div className="w-full h-full flex flex-col items-center bg-background">
      <MainNavbar />
      <ScrollArea className="w-full h-screen-max">
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="max-w-[1920px] w-full h-full flex flex-col items-center justify-center gap-8">
            <Survey
              pois={pois.map((poi) => {
                const images = poiImagesMap.get(poi.id);
                const randomImage =
                  images?.[Math.floor(Math.random() * images.length)];
                const tags = poiTagsMap.get(poi.id) ?? [];
                return {
                  id: poi.id,
                  imageUrl: randomImage ?? "",
                  name: poi.name,
                  description: poi.description,
                  latitude: poi.latitude,
                  longitude: poi.longitude,
                  tags: tags,
                };
              })}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
