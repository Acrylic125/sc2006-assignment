import { Survey } from "@/components/survey";
import { db } from "@/db";
import { poiImagesTable, poiTable } from "@/db/schema";
import { eq, exists, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";

export default async function SurveyPage() {
  const c = await cookies();
  const fakeUserId = c.get("fakeUserId")?.value;
  if (!fakeUserId) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center">
        <div className="max-w-3xl w-full">Uhh something went wrong</div>
      </div>
    );
  }

  const poisWithImaghes = await db
    .select({
      id: poiTable.id,
    })
    .from(poiTable)
    .where(
      exists(
        db
          .select()
          .from(poiImagesTable)
          .where(eq(poiImagesTable.poiId, poiTable.id))
      )
      // Order by random
    )
    .orderBy(sql`random()`)
    .limit(30);

  // Get images for each poi
  const poiImages = await db
    .select({
      poiId: poiImagesTable.poiId,
      imageUrl: poiImagesTable.imageUrl,
    })
    .from(poiImagesTable)
    .where(
      inArray(
        poiImagesTable.poiId,
        poisWithImaghes.map((poi) => poi.id)
      )
    );

  const poiImagesMap = new Map<number, string[]>();
  for (const poiImage of poiImages) {
    poiImagesMap.set(poiImage.poiId, [
      ...(poiImagesMap.get(poiImage.poiId) ?? []),
      poiImage.imageUrl,
    ]);
  }
  const pois = poisWithImaghes
    .map((poi) => {
      const images = poiImagesMap.get(poi.id);
      if (!images) {
        return null;
      }
      return {
        poiId: poi.id,
        imageUrl: images[0],
      };
    })
    .filter((poi) => poi !== null);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full">
        <Survey pois={pois} />
      </div>
    </div>
  );
}
