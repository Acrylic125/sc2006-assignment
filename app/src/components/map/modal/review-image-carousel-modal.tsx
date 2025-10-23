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
import { useEffect, useState } from "react";

export function ReviewImageDialog({
  options,
  close,
}: {
  options: ExtractOptions<"review-image-carousel">;
  close: () => void;
}) {
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    api.scrollTo(options.defaultIndex ?? 0);
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, options.defaultIndex]);

  const images = options.images;
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
                src={image.startsWith("https://") ? image : `https://${image}`}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="object-contain bg-transparent"
                fill
                alt="Image"
              />
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
