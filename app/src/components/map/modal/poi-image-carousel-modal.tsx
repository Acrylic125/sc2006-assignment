import { useForm } from "react-hook-form";
import { ExtractOptions } from "./map-modal-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { trpc } from "@/server/client";
import { Skeleton } from "../../ui/skeleton";

import {
  Virtual,
  Pagination,
  Mousewheel,
  Keyboard,
  Navigation,
} from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/virtual";
import "swiper/css/pagination";
import "swiper/css/keyboard";
import "swiper/css/mousewheel";
import "swiper/css/navigation";

import { useState } from "react";
import Image from "next/image";

const POIImageCarouselSchema = z.object({
  poiId: z.number(),
  name: z.string(),
});

export function POIImageCarouselDialog({
  options,
  close,
}: {
  options: ExtractOptions<"poi-image-carousel">;
  close: () => void;
}) {
  const form = useForm<z.infer<typeof POIImageCarouselSchema>>({
    resolver: zodResolver(POIImageCarouselSchema),
    defaultValues: {
      poiId: options.poiId,
      name: options.name,
    },
  });
  const [loading, setLoading] = useState(true);
  const imagesQuery = trpc.map.getPOIImages.useQuery({
    poiId: options.poiId,
  });

  if (imagesQuery.isLoading || imagesQuery.isFetching) {
    return (
      <div className="h-[75vh] min-w-[20vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="mb-4">{options.name}</DialogTitle>
        </DialogHeader>
        <Skeleton className="w-auto h-[75vh]" />
      </div>
    );
  }

  const imagesData = imagesQuery.data;
  //console.log(imagesData);

  if (imagesData === null || imagesData === undefined) {
    console.log("Error loading carousel: missing images");
    return (
      <div className="h-[75vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="mb-4">{options.name}</DialogTitle>
        </DialogHeader>
        <h3 className="text-base font-bold text-center">
          Carousel images failed to load.
        </h3>
      </div>
    );
  }

  const images = imagesData.images;
  const usernames = imagesData.uploaders;

  //overflow-hidden is needed or swiper slides will flicker
  return (
    <div className="h-[75vh] overflow-hidden">
      <DialogHeader>
        <DialogTitle className="mb-4">{options.name}</DialogTitle>
      </DialogHeader>

      <Swiper
        modules={[Virtual, Pagination, Keyboard, Mousewheel, Navigation]}
        spaceBetween={10}
        slidesPerView={1}
        pagination={{
          type: "bullets",
          clickable: true,
          dynamicBullets: true,
          dynamicMainBullets: 10,
        }}
        virtual
        keyboard={{ enabled: true }}
        mousewheel={{ enabled: true }}
        navigation={{ enabled: false }}
        centeredSlides={true}
        className="h-[70vh]"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index} virtualIndex={index}>
            <div className="relative inline-block w-full items-center justify-center">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="absolute inset-0 w-full h-full rounded-md" />
                </div>
              )}
              <Image
                src={
                  image.imageUrl.startsWith("https://")
                    ? image.imageUrl
                    : `https://${image.imageUrl}`
                }
                alt={`${options.name} Image ${index}`}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
                className="w-full h-[65vh] object-contain ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity "
              />
              <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gray-800 opacity-70">
                <h3 className="text-s text-white font-bold">
                  Uploaded by: {usernames[index] ?? "Unknown"}
                </h3>
                <p className="text-s text-gray-300">{image.creationDate}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
