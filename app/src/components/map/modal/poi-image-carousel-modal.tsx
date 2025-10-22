import { ExtractOptions } from "./map-modal-store";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { trpc } from "@/server/client";
import { Skeleton } from "../../ui/skeleton";

// import {
//   Virtual,
//   Pagination,
//   Mousewheel,
//   Keyboard,
//   Navigation,
// } from "swiper/modules";
// import { Swiper, SwiperSlide } from "swiper/react";
// import "swiper/css";
// import "swiper/css/virtual";
// import "swiper/css/pagination";
// import "swiper/css/keyboard";
// import "swiper/css/mousewheel";
// import "swiper/css/navigation";

import {
  Carousel,
  // CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
// import { useEffect, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function POIImageCarouselDialog({
  options,
  close,
}: {
  options: ExtractOptions<"poi-image-carousel">;
  close: () => void;
}) {
  // const [api, setApi] = useState<CarouselApi | null>(null);
  // const [loading, setLoading] = useState(true);
  const imagesQuery = trpc.map.getPOIImages.useQuery({
    poiId: options.poiId,
  });

  // useEffect(() => {
  //   if (api) {
  //     api.on("select", () => {
  //       setSelectedImage(api.selectedScrollSnap());
  //     });
  //   }
  // }, [api]);
  // const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);

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
  // const usernames = imagesData.uploaders;

  return (
    <DialogContent
      className="p-0 bg-none gap-0 sm:max-w-7xl w-full rounded-3xl overflow-hidden max-w-7xl"
      onClick={close}
    >
      <DialogHeader className="p-0 py-0">
        <DialogTitle className="sr-only">{options.name}</DialogTitle>
      </DialogHeader>
      <Carousel
        className="p-0"
        // setApi={setApi}
      >
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

      {/* {selectedImage?.uploader && (
        <div className="absolute w-full h-fit px-12 py-8 flex flex-row items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={selectedImage.uploader.imageUrl} />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <p className="text-foreground text-sm font-bold">
              {selectedImage.uploader.username}
            </p>
            <p className="text-muted-foreground text-xs">
              {new Date(selectedImage.creationDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      )} */}
    </DialogContent>
  );

  //overflow-hidden is needed or swiper slides will flicker
  // return (
  //   <div className="w-full h-full overflow-hidden">
  //     <DialogHeader>
  //       <DialogTitle className="mb-4 sr-only">{options.name}</DialogTitle>
  //     </DialogHeader>

  //     {/* <Image
  //       src={images[0].imageUrl}
  //       alt="Current Image"
  //       width="100"
  //       height="100"
  //       // layout="
  //       className="w-xl h-auto"
  //     /> */}
  //     <Carousel className="p-0">
  //       <CarouselContent>
  //         {images.map((image, index) => (
  //           <CarouselItem key={index} className="w-xl h-fit p-0 relative">
  //             <Image
  //               src={
  //                 image.imageUrl.startsWith("https://")
  //                   ? image.imageUrl
  //                   : `https://${image.imageUrl}`
  //               }
  //               // width={0}
  //               // height={0}
  //               // fill
  //               // className="w-full h-auto"
  //               height={0}
  //               width={0}
  //               style={{ width: "120px", height: "auto" }}
  //               alt="Current Image"
  //               // onLoadingComplete={({ naturalWidth, naturalHeight }) =>
  //               //   setAspectRatio(naturalWidth / naturalHeight)
  //               // }
  //               // fill
  //             />
  //           </CarouselItem>
  //         ))}
  //       </CarouselContent>
  //       <CarouselPrevious />
  //       <CarouselNext />
  //     </Carousel>
  //     {/* <Swiper
  //       modules={[Virtual, Pagination, Keyboard, Mousewheel, Navigation]}
  //       spaceBetween={10}
  //       slidesPerView={1}
  //       pagination={{
  //         type: "bullets",
  //         clickable: true,
  //         dynamicBullets: true,
  //         dynamicMainBullets: 10,
  //       }}
  //       virtual
  //       keyboard={{ enabled: true }}
  //       mousewheel={{ enabled: true }}
  //       navigation={{ enabled: false }}
  //       centeredSlides={true}
  //       className="w-full"
  //     >
  //       {images.map((image, index) => (
  //         <SwiperSlide key={index} virtualIndex={index}>
  //           <div className="relative inline-block w-full items-center justify-center">
  //             {loading && (
  //               <div className="absolute inset-0 flex items-center justify-center">
  //                 <Skeleton className="absolute inset-0 w-full h-full rounded-md" />
  //               </div>
  //             )}
  //             <div className="w-full aspect-[4/3] relative">
  //               <Image
  //                 src={
  //                   image.imageUrl.startsWith("https://")
  //                     ? image.imageUrl
  //                     : `https://${image.imageUrl}`
  //                 }
  //                 alt={`${options.name} Image ${index}`}
  //                 fill
  //                 onLoad={() => setLoading(false)}
  //                 onError={() => setLoading(false)}
  //                 className={`w-full object-fit ${loading ? "opacity-0" : "opacity-100"} `}
  //               />
  //             </div>

  //             <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gray-800 opacity-70">
  //               <h3 className="text-s text-white font-bold">
  //                 Uploaded by: {usernames[index] ?? "Unknown"}
  //               </h3>
  //               <p className="text-s text-gray-300">{image.creationDate}</p>
  //             </div>
  //           </div>
  //         </SwiperSlide>
  //       ))}
  //     </Swiper> */}
  //   </div>
  // );
}
