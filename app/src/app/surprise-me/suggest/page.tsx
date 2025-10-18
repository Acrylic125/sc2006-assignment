import { MainNavbar } from "@/components/navbar";
import { ExploreMoreButton } from "@/components/surprise-me/explore-more-button";
import { SeeMoreButton } from "@/components/surprise-me/see-more-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/db";
import { poiImagesTable, poiTable } from "@/db/schema";
import { appRouter } from "@/server/router";
import { createCallerFactory } from "@/server/trpc";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { inArray, sql } from "drizzle-orm";
import { Navigation } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const createCaller = createCallerFactory(appRouter);

export default async function SuggestPage() {
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

  const caller = createCaller({
    auth: isAuthed,
  });
  const reocmmendedPoisQuery = await caller.map.recommend({
    showVisited: true,
    showUnvisited: true,
    excludedTags: [],
    recommendFromLocation: {
      // Center of Singapore
      latitude: 1.3521,
      longitude: 103.8198,
    },
    recommendRadius: 100,
  });
  const [pois, poiImages] = await Promise.all([
    db
      .select({
        id: poiTable.id,
        name: poiTable.name,
        description: poiTable.description,
        // Select as numbers
        latitude: sql<number>`CAST(${poiTable.latitude} AS DOUBLE PRECISION)`,
        longitude: sql<number>`CAST(${poiTable.longitude} AS DOUBLE PRECISION)`,
      })
      .from(poiTable)
      .where(
        inArray(
          poiTable.id,
          reocmmendedPoisQuery.map((poi) => poi.id)
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
          reocmmendedPoisQuery.map((poi) => poi.id)
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

  return (
    <div className="w-full h-full flex flex-col items-center bg-background">
      <MainNavbar />
      <ScrollArea className="w-full h-screen-max">
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="max-w-7xl w-full h-full flex flex-col items-center justify-center gap-8 p-4 md:p-8 lg:p-12">
            <h1 className="w-full text-3xl font-bold">You may like...</h1>
            <div className="w-full flex flex-col gap-4">
              {pois.map((poi) => {
                console.log(poi);
                const images = poiImagesMap.get(poi.id);
                let imageUrl = "";
                if (images) {
                  imageUrl = images[Math.floor(Math.random() * images.length)];
                }
                return (
                  <div
                    key={poi.id}
                    className="h-48 flex flex-row border-border border rounded-md bg-secondary"
                  >
                    <div className="w-1/3 max-w-72 relative aspect-[4/3]">
                      {imageUrl && (
                        <Image
                          src={
                            imageUrl.startsWith("http")
                              ? imageUrl
                              : `https://${imageUrl}`
                          }
                          alt={poi.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div
                      key={poi.id}
                      className="flex-1 flex flex-col p-4 h-full justify-between"
                    >
                      <div className="flex flex-col gap-2 max-w-lg">
                        <h2 className="text-xl font-bold">{poi.name}</h2>
                        <p className="text-muted-foreground line-clamp-3">
                          {poi.description}
                        </p>
                      </div>
                      <div className="flex flex-row gap-2">
                        <SeeMoreButton
                          poiId={poi.id}
                          latitude={poi.latitude}
                          longitude={poi.longitude}
                        />
                        <Button variant="outline" asChild className="w-fit p-0">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              poi.name
                            )}`}
                            aria-label={`Navigate to ${poi.name} on Google Maps`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Navigation />
                            Navigate
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full flex flex-col gap-4">
              <h1 className="w-full text-3xl font-bold">
                Still can{"'"}t decide?
              </h1>
              <div className="w-full flex flex-row gap-8 items-center justify-center h-24 border-border border-4 border-dashed rounded-md bg-secondary">
                <ExploreMoreButton />
                <span>Or</span>
                <Button variant="outline" asChild>
                  <Link href="/surprise-me">Survey Me</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
