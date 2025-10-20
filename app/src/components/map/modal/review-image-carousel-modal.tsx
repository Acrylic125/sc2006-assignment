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

const ReviewImageCarouselSchema = z.object({
  reviewId: z.number(),
  images: z.array(z.string()),
  reviewComment: z.string(),
});

export function ReviewImageCarouselDialog({
  options,
  close,
}: {
  options: ExtractOptions<"review-image-carousel">;
  close: () => void;
}) {
  const form = useForm<z.infer<typeof ReviewImageCarouselSchema>>({
    resolver: zodResolver(ReviewImageCarouselSchema),
    defaultValues: {
      reviewId: options.reviewId,
      images: options.images,
      reviewComment: options.reviewComment,
    },
  });
  const [loading, setLoading] = useState(true);

  const images = options.images;
  const reviewComment = options.reviewComment;

  //overflow-hidden is needed or swiper slides will flicker
  return (
    <div className="w-full overflow-hidden">
      <DialogHeader>
        <DialogTitle className="mb-4">Review Images</DialogTitle>
        {reviewComment && (
          <DialogDescription className="mb-4">
            "{reviewComment}"
          </DialogDescription>
        )}
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
        className="w-full"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index} virtualIndex={index}>
            <div className="relative inline-block w-full items-center justify-center">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="absolute inset-0 w-full h-full rounded-md" />
                </div>
              )}
              <div className="w-full aspect-[4/3] relative">
                <Image
                  src={
                    image.startsWith("https://")
                      ? image
                      : `https://${image}`
                  }
                  alt={`Review Image ${index + 1}`}
                  fill
                  onLoad={() => setLoading(false)}
                  onError={() => setLoading(false)}
                  className={`w-full object-fit ${loading ? "opacity-0" : "opacity-100"} transition-opacity `}
                />
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
