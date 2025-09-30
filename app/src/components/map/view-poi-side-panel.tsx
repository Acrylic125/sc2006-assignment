"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDurationToClosestUnit } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { MapPin, Navigation, Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useQueryState, parseAsInteger } from "nuqs";
import { useMapModalStore } from "./modal/map-modal-store";
import { useShallow } from "zustand/react/shallow";
import { useMapStore } from "./map-store";

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
                <ThumbsUp className="size-4 stroke-primary dark:fill-primary/25" />
              ) : (
                <ThumbsDown className="size-4 stroke-red-400 fill-red-200/25 dark:fill-red-700/25" />
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

export function ViewPOIPanel() {
  // use nuqs to get the poiId
  const [poiId, setPoiId] = useQueryState("poiId", parseAsInteger);
  // TODO: Currently, the POI is hardcoded. Create a trpc router that interacts with the database to get the POI.
  const poi = {
    name: "Marina Bay Sands",
    description: "Marina Bay Sands is a hotel and casino located in Singapore.",
    image: "/example.png",
    latitude: 1.2834,
    longitude: 103.8607,
  };

  if (poiId === null) {
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
        <Image src={poi.image} alt={poi.name} fill className="object-cover" />
      </div>
      <div className="flex flex-col p-1">
        <h1 className="text-base font-bold">{poi.name}</h1>
        <p className="text-sm text-muted-foreground">{poi.description}</p>
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
