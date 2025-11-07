"use client";

import { ExtractOptions } from "./map-modal-store";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/server/client";
import { Skeleton } from "../../ui/skeleton";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function POIImageCarouselDialog({
  options,
  close,
}: {
  options: ExtractOptions<"poi-image-carousel">;
  close: () => void;
}) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  // const [loading, setLoading] = useState(true);
  const imagesQuery = trpc.map.getPOIImages.useQuery({
    poiId: options.poiId,
  });

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  if (imagesQuery.isLoading || imagesQuery.isFetching) {
    return (
      <DialogContent
        className="p-0 bg-none gap-0 rounded-3xl sm:max-w-7xl w-full max-w-7xl"
        onClick={close}
      >
        <DialogHeader className="p-0 py-0">
          <DialogTitle className="sr-only">{options.name}</DialogTitle>
        </DialogHeader>

        <Skeleton className="w-full aspect-[4/3]" />

        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-row flex-2 h-24 items-center justify-center">
          <h2 className="text-base font-bold text-white">{options.name}</h2>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-20 flex flex-row flex-2 h-24 items-center justify-center">
          <h2 className="text-base font-bold text-white">
            {current} of {count}
          </h2>
        </div>
      </DialogContent>
    );
  }

  const imagesData = imagesQuery.data;

  if (imagesData === null || imagesData === undefined) {
    return (
      <DialogContent
        className="p-0 bg-none gap-0 rounded-3xl sm:max-w-7xl w-full max-w-7xl"
        onClick={close}
      >
        <DialogHeader className="p-0 py-0">
          <DialogTitle className="sr-only">{options.name}</DialogTitle>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTitle>Unable to load images.</AlertTitle>
          <AlertDescription>
            <p>No images found for this POI.</p>
          </AlertDescription>
        </Alert>

        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-row flex-2 h-24 items-center justify-center">
          <h2 className="text-base font-bold text-white">{options.name}</h2>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-20 flex flex-row flex-2 h-24 items-center justify-center">
          <h2 className="text-base font-bold text-white">
            {current} of {count}
          </h2>
        </div>
      </DialogContent>
    );
  }

  const images = imagesData.images;
  // const usernames = imagesData.uploaders;

  return (
    <DialogContent
      className="p-0 bg-none gap-0 rounded-3xl sm:max-w-7xl w-full max-w-7xl"
      onClick={close}
    >
      <DialogHeader className="p-0 py-0">
        <DialogTitle className="sr-only">{options.name}</DialogTitle>
      </DialogHeader>
      <Carousel className="p-0 rounded-3xl overflow-hidden" setApi={setApi}>
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem
              key={index}
              className="w-full p-0 relative aspect-[4/3]"
            >
              <Image
                src={
                  image.imageUrl.startsWith("https://")
                    ? image.imageUrl
                    : `https://${image.imageUrl}`
                }
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="object-contain bg-transparent"
                fill
                alt="Image"
              />
              <div className="absolute top-0 left-0 w-full h-24 px-12 flex flex-row items-center justify-between bg-gradient-to-b to-transparent from-black/50 gap-4">
                {image.uploader ? (
                  <div className="flex flex-row items-center h-full flex-1 gap-4">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={image.uploader.imageUrl} />
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-foreground text-sm font-bold">
                        {image.uploader.username}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(image.creationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-row items-center h-full flex-1" />
                )}

                {/* <div className="flex flex-row flex-2 h-full items-start pt-8 justify-center">
                  <h2 className="text-base font-bold text-white">
                    {options.name}
                  </h2>
                </div> */}
                <div className="flex flex-row items-center flex-1"></div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="top-1/2 left-8 -translate-y-1/2" />
        <CarouselNext className="top-1/2 right-8 -translate-y-1/2" />
      </Carousel>
      <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-row flex-2 h-24 items-center justify-center">
        <h2 className="text-base font-bold text-white">{options.name}</h2>
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-20 flex flex-row flex-2 h-24 items-center justify-center">
        <h2 className="text-base font-bold text-white">
          {current} of {count}
        </h2>
      </div>
    </DialogContent>
  );
}
