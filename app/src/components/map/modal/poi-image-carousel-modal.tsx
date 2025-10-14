
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

import { Virtual, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/virtual';

import { createClerkClient } from '@clerk/backend'

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

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

  const imagesQuery = trpc.map.getPOIImages.useQuery({
    poiId: options.poiId,
  });

  if (imagesQuery.isLoading) {
    return (
      <div className="w-full flex flex-col gap-2">
        <Skeleton className="w-auto h-auto" />
      </div>
    );
  }

  const imagesData = imagesQuery.data;
  console.log(imagesData);

  if (imagesData === null || imagesData === undefined) {
    console.log("Error loading carousel: missing images")
  } else {
    const images = imagesData.images
    const usernames = imagesData.uploaders;
    //overflow-hidden is needed or swiper slides will flicker
    //for some reason if the width is specified below the slide goes off center
    return (
      <div className="h-[75vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="mb-6">
            {options.name}
          </DialogTitle>
        </DialogHeader>

        <div>
          <Swiper 
            modules={[Virtual, Pagination]} 
            spaceBetween={10} 
            slidesPerView={1} 
            pagination={{ type: 'bullets', clickable: true }}
            virtual
            centeredSlides={true}
          >
            {images.map((image, index) => (
              <SwiperSlide 
                key={index} 
                virtualIndex={index}
              >
                <div className="relative inline-block">
                <img 
                  src={image.imageUrl} 
                  alt={`Slide ${index}`} 
                />
                <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gray-800 opacity-70">
                  <h3 className="text-s text-white font-bold">
                    Uploaded by: {usernames[index] ?? ''}
                  </h3> 
                  <p className="text-s text-gray-300">
                    {image.creationDate}
                  </p>
                </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    );
  }
}