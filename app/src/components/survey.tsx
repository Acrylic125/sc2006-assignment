"use client";

import { trpc } from "@/server/client";
import Image from "next/image";
import { useState } from "react";
import { Button } from "./ui/button";

export function Survey({
  pois,
}: {
  pois: {
    poiId: number;
    imageUrl: string;
  }[];
}) {
  const [currentPoiIndex, setCurrentPoiIndex] = useState(0);

  const indicatePreferenceMut =
    trpc.experimental.indicatePreference.useMutation({
      onSuccess: () => {
        setCurrentPoiIndex(currentPoiIndex + 1);
      },
    });
  if (pois.length === 0 || currentPoiIndex >= pois.length) {
    return (
      <div className="w-full flex flex-col gap-4 items-center justify-center text-2xl font-bold">
        You are done!
      </div>
    );
  }

  let imageUrl = pois[currentPoiIndex].imageUrl;
  if (!imageUrl.startsWith("https://")) {
    imageUrl = `https://${imageUrl}`;
  }
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full aspect-[4/3] relative">
        <Image
          src={imageUrl}
          alt="Please skip if you do not see this image."
          fill
          className="object-cover"
        />
      </div>
      <div className="flex flex-row gap-2 items-center justify-between">
        <div className="flex flex-row gap-2">
          <Button
            variant="default"
            onClick={() =>
              indicatePreferenceMut.mutate({
                poiId: pois[currentPoiIndex].poiId,
                liked: false,
              })
            }
          >
            I dont like this
          </Button>
          <Button
            variant="default"
            onClick={() =>
              indicatePreferenceMut.mutate({
                poiId: pois[currentPoiIndex].poiId,
                liked: true,
              })
            }
          >
            I like this
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {currentPoiIndex + 1} / {pois.length}
        </div>
      </div>
    </div>
  );
}
