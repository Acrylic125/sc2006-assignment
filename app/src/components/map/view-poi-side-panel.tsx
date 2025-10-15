"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDurationToClosestUnit } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import {
  ImageIcon,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { useQueryState, parseAsInteger } from "nuqs";
import { useMapModalStore } from "./modal/map-modal-store";
import { useShallow } from "zustand/react/shallow";
import { useMapStore } from "./map-store";
import { DislikeButton, LikeButton } from "../icons/like-dislike-icons";
import { trpc } from "@/server/client";
import { Skeleton } from "../ui/skeleton";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge"
import { useState } from "react";

export function ViewPOIReviews({ poiId }: { poiId: number }) {
  const auth = useAuth();

  // TODO: Retrieve personal reviews + other reviews using the Reviews Router.
  const reviews = [
    {
      id: 1,
      liked: false,
      comment: "This is a review",
      images: ["/example.png", "/example.png", "/example.png"],
      age: 30000,
      // createdAt: new Date(),
      // User needs to be retrieved from clerk.
      // See https://clerk.com/docs/reference/backend/user/get-user-list
      // Filter by `userId`. Note the limit is 100. We will only ever
      // retrieve up to 50 reviews at a time so this limit will never
      // be reached.
      user: {
        id: "user_123",
        name: "User 1",
        profilePicture: "https://github.com/shadcn.png",
      },
      itinerary: {
        id: 1,
        name: "Itinerary 1",
      },
    },
    {
      id: 2,
      liked: true,
      comment: "This is a review",
      images: ["/example.png", "/example.png", "/example.png"],
      age: 86400000,
      // createdAt: new Date(),
      // User needs to be retrieved from clerk.
      // See https://clerk.com/docs/reference/backend/user/get-user-list
      // Filter by `userId`. Note the limit is 100. We will only ever
      // retrieve up to 50 reviews at a time so this limit will never
      // be reached.
      user: {
        id: "user_123",
        name: "User 1",
        profilePicture: "https://github.com/shadcn.png",
      },
      itinerary: {
        id: 1,
        name: "Itinerary 1",
      },
    },
  ];

  const modalStore = useMapModalStore(
    useShallow(({ setAction }) => {
      return {
        setAction,
      };
    })
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-center justify-between">
        <h3 className="font-medium">Reviews</h3>
        <Button
          variant="default"
          size="sm"
          disabled={!auth.isSignedIn}
          onClick={() => {
            modalStore.setAction({
              type: "itinerary-poi-review",
              options: {
                poiId: poiId,
              },
            });
          }}
        >
          <Plus /> Review
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="flex flex-col border border-border rounded-md p-2 bg-secondary gap-2"
          >
            <div className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <Avatar>
                  <AvatarImage src={review.user.profilePicture} />
                  <AvatarFallback>Profile</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{review.user.name}</span>
              </div>

              {review.liked ? (
                <LikeButton active />
              ) : (
                // <ThumbsUp className="size-4 stroke-primary dark:fill-primary/25" />
                <DislikeButton active />
                // <ThumbsDown className="size-4 stroke-red-400 fill-red-200/25 dark:fill-red-700/25" />
              )}
            </div>
            <p className="text-sm font-light text-foreground">
              {review.comment}
            </p>
            <div className="flex flex-row items-center gap-2">
              {review.images.map((image, i) => (
                <div className="w-1/3 aspect-square relative" key={i}>
                  <Image
                    src={image}
                    alt={review.comment}
                    className="object-cover"
                    fill
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-row justify-between">
              <span className="text-sm flex-1 truncate">
                {(auth.userId === review.user.id || true) &&
                  review.itinerary.name}
              </span>
              <span className="flex flex-row items-center text-muted-foreground text-sm flex-1 truncate justify-end">
                {formatDurationToClosestUnit(review.age)} ago
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ViewExistingPOIPanel({ poiId }: { poiId: number }) {
  const modalStore = useMapModalStore(
    useShallow(({ setAction }) => {
      return {
        setAction,
      };
    })
  );
  const mapStore = useMapStore(
    useShallow(
      ({
        filters,
        setFilterExcludedTags,
        tagBadgeOrder,
        setTagBadgeOrder,
      }) => {
        return {
          excludedTags: filters.excludedTags,
          setFilterExcludedTags,
          tagBadgeOrder,
          setTagBadgeOrder,
        };
      }
    )
  );

  const poiQuery = trpc.map.getPOI.useQuery(
    { id: poiId ?? 0 },
    {
      enabled: poiId !== null,
    }
  );
  const poiTagQuery = trpc.map.getPOITags.useQuery(
    { poiId: poiId ?? 0,
      excludedTags: Array.from(mapStore.excludedTags),
      tagIdOrder: mapStore.tagBadgeOrder,
    }
  );

  if (poiQuery.isLoading || poiTagQuery.isLoading) {
    return (
      <div className="w-full flex flex-col gap-2">
        <div className="w-full aspect-[4/3] relative">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="flex flex-col p-1 gap-2">
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-1/2 h-4" />
        </div>
      </div>
    );
  }

  const poi = poiQuery.data;
  const poiTags = poiTagQuery.data?.tagsData;
  const poiTagsOrder = poiTagQuery.data?.tagOrder ?? [];

  if (poi === null || poi === undefined || poiTags === null || poiTags === undefined) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-14 px-4 md:py-16">
        <div className="w-fit lg:w-full flex flex-col gap-2 items-center justify-center p-4 bg-secondary border-border border rounded-md">
          <MapPin className="size-6 stroke-red-400" />
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-center">
              No pin selected!
            </h3>
            <p className="text-muted-foreground text-center text-sm">
              Select a pin on the map to view more information.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      <div className="w-full aspect-[4/3] relative">
        {poi.images.length > 0 && poi.images[0] !== "" ? (
          <div className="inline-block">
            <Image
              src={
                poi.images[0].startsWith("https://")
                  ? poi.images[0]
                  : `https://${poi.images[0]}`
              }
              alt={poi.name}
              fill
              className="object-cover cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                modalStore.setAction({
                  type: "poi-image-carousel",
                  options: {
                    poiId: poi.id,
                    name: poi.name,
                  },
                });
              }}
            />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-gray-800 opacity-70">
              <p className="text-xs text-gray-300">
                {poi.images.length} Image{poi.images.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 items-center justify-center w-full h-full bg-muted">
            <ImageIcon className="size-8" />
            No Image
          </div>
        )}
      </div>
      <div className="flex flex-col p-1">
        <h1 className="text-base font-bold">{poi.name}</h1>
        <p className="text-sm text-muted-foreground mb-2">{poi.description}</p>
        <div className="flex flex-wrap gap-1">
          {poiTags.map((tagdata) => (
            <Badge 
              key={tagdata.tag?.tagId} 
              variant="secondary"
              className={`${!tagdata.filtered ? "bg-green-300" : ""} cursor-pointer`}
              onClick={(e) => {
                e.stopPropagation();
                mapStore.setTagBadgeOrder(poiTagsOrder);
                const currentExcludedTags = new Set(mapStore.excludedTags);
                if (mapStore.excludedTags.has(tagdata.tag?.tagId ?? -1)) {
                  currentExcludedTags.delete(tagdata.tag?.tagId ?? -1);
                  mapStore.setFilterExcludedTags(currentExcludedTags);
                } else {
                  currentExcludedTags.add(tagdata.tag?.tagId ?? -1);
                  mapStore.setFilterExcludedTags(currentExcludedTags);
                }
              }}
            >
              {tagdata.tag?.tagName}
            </Badge>
          ))}
        </div>
        <div className="flex flex-col gap-1 py-4">
          <Button variant="ghost" asChild className="w-fit p-0">
            <a
              href={`https://www.google.com/maps?q=${poi.latitude},${poi.longitude}`}
            >
              <Navigation />
              Navigate
            </a>
          </Button>
          <Button className="w-full truncate" size="sm">
            Add to Itinerary
          </Button>
          <Button className="w-full truncate" variant="secondary" size="sm">
            Start Itinerary
          </Button>
        </div>
        <ViewPOIReviews poiId={poiId} />
      </div>
    </div>
  );
}

export function ViewNewPOIPanel({
  pos,
}: {
  pos: {
    latitude: number;
    longitude: number;
  };
}) {
  const modalStore = useMapModalStore(
    useShallow(({ setAction }) => {
      return {
        setAction,
      };
    })
  );
  const addrQuery = trpc.map.getAddress.useQuery({
    lat: pos.latitude,
    lng: pos.longitude,
  });
  if (addrQuery.isLoading || addrQuery.isFetching) {
    return(
      <div className="w-full flex flex-col gap-2">
        <div className="w-full aspect-[4/3] relative">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="flex flex-col p-1 gap-2">
          <Skeleton className="w-24 h-6" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-1/2 h-4" />
        </div>
      </div>
    );
  }

  const addr = addrQuery.data;
  const coords = `Lat: ${pos.latitude.toFixed(2)}, Long: ${pos.longitude.toFixed(2)}`;
  const image = ""; //image placeholder
  const user = useUser().isSignedIn;

  return (
    <div className="w-full flex flex-col">
      <div className="w-full aspect-[4/3] relative">
        {image !== "" ? (
          <Image
            src={`https://${image}`}
            alt={addr}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col gap-2 items-center justify-center w-full h-full bg-muted">
            <ImageIcon className="size-8" />
            No Image
          </div>
        )}
      </div>
      <div className="flex flex-col p-1">
        <h1 className="text-base font-bold">{addr}</h1>
        <p className="text-sm text-muted-foreground">{coords}</p>
        <div className="flex flex-col gap-1 py-4">
          <Button variant="ghost" asChild className="w-fit p-0">
            <a
              href={`https://www.google.com/maps?q=${pos.latitude},${pos.longitude}`}
            >
              <Navigation />
              Navigate
            </a>
          </Button>
          <Button
            className="w-full truncate"
            size="sm"
            disabled={!user}
            onClick={(e) => {
              e.stopPropagation();
              modalStore.setAction({
                type: "create-poi",
                options: {
                  address: addr,
                  longitude: pos.longitude,
                  latitude: pos.latitude,
                  name: "",
                  description: "",
                  images: [],
                },
              });
            }}
          > 
            Upload your own POI here
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ViewPOIPanel() {
  const mapStore = useMapStore(
    useShallow(({ viewingPOI }) => {
      return {
        viewingPOI,
      };
    })
  );

  if (mapStore.viewingPOI?.type === "existing-poi") {
    return <ViewExistingPOIPanel poiId={mapStore.viewingPOI.poiId} />;
  } else if (mapStore.viewingPOI?.type === "new-poi") {
    return <ViewNewPOIPanel pos={mapStore.viewingPOI.pos} />;
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-14 px-4 md:py-16">
      <div className="w-fit lg:w-full flex flex-col gap-2 items-center justify-center p-4 bg-secondary border-border border rounded-md">
        <MapPin className="size-6 stroke-red-400" />
        <div className="flex flex-col">
          <h3 className="text-base font-bold text-center">No pin selected!</h3>
          <p className="text-muted-foreground text-center text-sm">
            Select a pin on the map to view more information.
          </p>
        </div>
      </div>
    </div>
  );
}
