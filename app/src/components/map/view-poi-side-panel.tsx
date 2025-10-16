"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatDurationToClosestUnit } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import {
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquareWarning,
  Navigation,
  Plus,
  Pointer,
  ThumbsDown,
  ThumbsUp,
  Upload,
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
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

export function ViewPOIReviews({ poiId }: { poiId: number }) {
  const auth = useAuth();

  // Get reviews from the backend
  const reviewsQuery = trpc.review.getReviews.useQuery({ poiId });
  const userReviewQuery = trpc.review.getUserReview.useQuery(
    { poiId },
    { enabled: !!auth.isSignedIn }
  );

  const utils = trpc.useUtils();

  const modalStore = useMapModalStore(
    useShallow(({ setAction }) => {
      return {
        setAction,
      };
    })
  );

  const handleDeleteReview = (reviewId: number) => {
    modalStore.setAction({
      type: "delete-review",
      options: {
        reviewId,
        poiId,
      },
    });
  };

  if (reviewsQuery.isLoading) {
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
            <Plus /> {userReviewQuery.data ? "Edit Review" : "Review"}
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const reviews = reviewsQuery.data || [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-center justify-between">
        <h3 className="font-medium">Reviews ({reviews.length})</h3>
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
          <Plus /> {userReviewQuery.data ? "Edit Review" : "Review"}
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {reviews.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No reviews yet. Be the first to review this place!
          </div>
        ) : (
          reviews.map((review) => {
            const isCurrentUser = review.userId === auth.userId;
            return (
              <div
                key={review.id}
                className="flex flex-col border border-border rounded-md p-2 bg-secondary gap-2"
              >
                <div className="flex flex-row items-center justify-between gap-2">
                  <div className="flex flex-row items-center gap-2">
                    <Avatar>
                      <AvatarImage
                        src={
                          review.user?.imageUrl ||
                          "https://github.com/shadcn.png"
                        }
                      />
                      <AvatarFallback>
                        {isCurrentUser
                          ? "You"
                          : review.user?.firstName?.[0] ||
                            review.userId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {isCurrentUser
                        ? "You"
                        : review.user?.firstName && review.user?.lastName
                          ? `${review.user.firstName} ${review.user.lastName}`
                          : review.user?.username || review.userId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {review.liked ? (
                      <LikeButton active />
                    ) : (
                      <DislikeButton active />
                    )}
                    {isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-red-500 hover:text-red-700 p-1 h-auto"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm font-light text-foreground">
                    {review.comment}
                  </p>
                )}
                {/* Always show example image for now */}
                <div className="flex flex-row items-center gap-2">
                  <div className="w-1/3 aspect-square relative">
                    <Image
                      src="/example.png"
                      alt={review.comment || "Review image"}
                      className="object-cover rounded"
                      fill
                    />
                  </div>
                  {review.images && review.images.length > 1 && (
                    <>
                      {review.images.slice(1, 3).map((image, i) => (
                        <div className="w-1/3 aspect-square relative" key={i}>
                          <Image
                            src={image}
                            alt={review.comment || "Review image"}
                            className="object-cover rounded"
                            fill
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
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
        viewingItineraryId,
        setViewingItineraryId,
        setCurrentSidePanelTab,
      }) => {
        return {
          excludedTags: filters.excludedTags,
          setFilterExcludedTags,
          tagBadgeOrder,
          setTagBadgeOrder,
          viewingItineraryId,
          setViewingItineraryId,
          setCurrentSidePanelTab,
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
  const poiTagQuery = trpc.map.getPOITags.useQuery({
    poiId,
  });

  const sortedTags = useMemo(() => {
    const tagNames = poiTagQuery.data;
    if (tagNames === undefined) {
      return { tagsData: [], tagOrder: [] };
    }
    // Do sorting in here using poiTagQuery.data
    const filteredTagNames = tagNames.map((tag) => ({
      tagId: tag.tagId,
      name: tag.name,
      excluded: mapStore.excludedTags.has(tag.tagId),
    }));

    if (mapStore.tagBadgeOrder.length === 0) {
      //console.log(sortedTagNames)
      const sortedTagNames = [
        ...filteredTagNames.sort((a, b) => {
          if (a.excluded === b.excluded)
            return 0; //if filter state is same, keep order
          else if (a.excluded)
            return 1; //if a has been filtered away but not b, place at the end
          else return -1; //else place it infront of b
        }),
      ];
      const tagOrderData = sortedTagNames.map((item) => item.tagId);
      return { tagsData: sortedTagNames, tagOrder: tagOrderData };
    }
    //console.log(filteredTagNames)
    const sortedTagNames = [
      ...filteredTagNames.sort((a, b) => {
        const aIndex = mapStore.tagBadgeOrder.indexOf(a.tagId);
        const bIndex = mapStore.tagBadgeOrder.indexOf(b.tagId);
        if (aIndex === bIndex)
          return 0; //if id is same, keep order
        else if (aIndex > bIndex)
          return 1; //if a has been filtered away but not b, place at the end
        else return -1; //else place it infront of b
      }),
    ];
    const tagOrderData = sortedTagNames.map((item) => item.tagId);
    return { tagsData: sortedTagNames, tagOrder: tagOrderData };
  }, [poiTagQuery.data, mapStore.excludedTags, mapStore.tagBadgeOrder]);

  // Get user's itineraries
  const itinerariesQuery = trpc.itinerary.getAllItineraries.useQuery();

  // Mutation for adding POI to itinerary
  const addPOIToItineraryMutation =
    trpc.itinerary.addPOIToItinerary.useMutation();

  // TRPC utilities for cache invalidation
  const utils = trpc.useUtils();

  const isUserSignedIn = useUser().isSignedIn;

  // Map store for managing state
  // const mapStore = useMapStore(
  //   useShallow(({ viewingItineraryId, setViewingItineraryId, setCurrentSidePanelTab }) => {
  //     return {
  //       viewingItineraryId,
  //       setViewingItineraryId,
  //       setCurrentSidePanelTab,
  //     };
  //   })
  // );

  // Modal store for showing modals
  // const modalStore = useMapModalStore();

  if (poiQuery.isLoading) {
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
  const poiTags = sortedTags.tagsData;
  // TODO: Whats the purpose of this?
  const poiTagsOrder = sortedTags.tagOrder;

  console.log(poiTags);
  if (
    poi === null ||
    poi === undefined ||
    poiTags === null ||
    poiTags === undefined
  ) {
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

  // Function to handle adding POI to an itinerary
  const handleAddToItinerary = () => {
    console.log("Add to itinerary clicked");
    console.log("Itineraries data:", itinerariesQuery.data);
    console.log(
      "Currently selected itinerary ID:",
      mapStore.viewingItineraryId
    );

    // Check if there's a currently selected itinerary
    if (mapStore.viewingItineraryId !== null) {
      console.log(
        "Adding to currently selected itinerary ID:",
        mapStore.viewingItineraryId
      );
      addPOIToItineraryMutation.mutate(
        {
          itineraryId: mapStore.viewingItineraryId,
          poiId: poiId,
        },
        {
          onSuccess: (data) => {
            console.log("Successfully added POI to itinerary:", data);
            // Switch to the itinerary panel
            mapStore.setCurrentSidePanelTab("itinerary");
            // Invalidate the itinerary query to refresh the data
            utils.itinerary.getItinerary.invalidate({
              id: mapStore.viewingItineraryId!,
            });
            // Also invalidate the map search to refresh POI colors
            utils.map.search.invalidate();
            // Invalidate all itineraries to update the list
            utils.itinerary.getAllItineraries.invalidate();
          },
          onError: (error) => {
            console.error("Failed to add POI to itinerary:", error);
            // Check if the error is because the POI is already in the itinerary
            if (
              error.message &&
              error.message.includes("already in this itinerary")
            ) {
              console.log(
                "POI is already in this itinerary, switching to itinerary panel to show current state"
              );
            }
            // Even if there's an error (like POI already in itinerary),
            // still switch to the itinerary panel to show the current state
            mapStore.setCurrentSidePanelTab("itinerary");
            // Invalidate queries to refresh the data
            utils.itinerary.getItinerary.invalidate({
              id: mapStore.viewingItineraryId!,
            });
            utils.map.search.invalidate();
            utils.itinerary.getAllItineraries.invalidate();
          },
        }
      );
    }
    // If no itinerary is currently selected, but there are itineraries, add to the first one
    else if (itinerariesQuery.data && itinerariesQuery.data.length > 0) {
      console.log(
        "No itinerary selected, adding to first itinerary ID:",
        itinerariesQuery.data[0].id
      );
      addPOIToItineraryMutation.mutate(
        {
          itineraryId: itinerariesQuery.data[0].id,
          poiId: poiId,
        },
        {
          onSuccess: (data) => {
            console.log("Successfully added POI to itinerary:", data);
            // Set the current itinerary as the viewing itinerary
            mapStore.setViewingItineraryId(itinerariesQuery.data[0].id);
            // Switch to the itinerary panel
            mapStore.setCurrentSidePanelTab("itinerary");
            // Invalidate the itinerary query to refresh the data
            utils.itinerary.getItinerary.invalidate({
              id: itinerariesQuery.data[0].id,
            });
            // Also invalidate the map search to refresh POI colors
            utils.map.search.invalidate();
            // Invalidate all itineraries to update the list
            utils.itinerary.getAllItineraries.invalidate();
          },
          onError: (error) => {
            console.error("Failed to add POI to itinerary:", error);
            // Check if the error is because the POI is already in the itinerary
            if (
              error.message &&
              error.message.includes("already in this itinerary")
            ) {
              console.log(
                "POI is already in this itinerary, switching to itinerary panel to show current state"
              );
            }
            // Even if there's an error (like POI already in itinerary),
            // still switch to the itinerary panel to show the current state
            mapStore.setViewingItineraryId(itinerariesQuery.data[0].id);
            mapStore.setCurrentSidePanelTab("itinerary");
            // Invalidate queries to refresh the data
            utils.itinerary.getItinerary.invalidate({
              id: itinerariesQuery.data[0].id,
            });
            utils.map.search.invalidate();
            utils.itinerary.getAllItineraries.invalidate();
          },
        }
      );
    }
    // If no itineraries exist at all, show create itinerary modal
    else {
      console.log("No itineraries found, showing create itinerary modal");
      // If no itineraries exist, show create itinerary modal
      modalStore.setAction({
        type: "create-itinerary",
        options: {
          longitude: poi.longitude,
          latitude: poi.latitude,
        },
      });
    }
  };

  // Function to handle starting an itinerary with this POI
  const handleStartItinerary = () => {
    console.log("Start itinerary clicked");
    console.log("POI data:", poi);
    // Show create itinerary modal with this POI as the starting point
    modalStore.setAction({
      type: "create-itinerary",
      options: {
        longitude: poi.longitude,
        latitude: poi.latitude,
        poiId: poiId, // Pass the POI ID
      },
    });
  };

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
                {poi.images.length} Image{poi.images.length > 1 ? "s" : ""}
              </p>
            </div>
            <Upload
              size={32}
              className={`absolute bottom-0 right-3 cursor-pointer stroke-white rounded-full p-2 shadow-lg ${!isUserSignedIn ? "pointer-events-none opacity-30" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                modalStore.setAction({
                  type: "upload-poi-image",
                  options: {
                    poiId: poi.id,
                    name: poi.name,
                    images: [],
                  },
                });
              }}
            />
          </div>
        ) : (
          <div className="relative inline-block h-full w-full">
            <div className="flex flex-col gap-2 items-center justify-center w-full h-full bg-muted">
              <ImageIcon className="size-8" />
              No Image
            </div>
            <Upload
              size={32}
              className={`absolute bottom-0 right-3 cursor-pointer stroke-white rounded-full p-2 shadow-lg ${!isUserSignedIn ? "pointer-events-none opacity-30" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                modalStore.setAction({
                  type: "upload-poi-image",
                  options: {
                    poiId: poi.id,
                    name: poi.name,
                    images: [],
                  },
                });
              }}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col p-1">
        <h1 className="text-base font-bold">{poi.name}</h1>
        <p className="text-sm text-muted-foreground">{poi.description}</p>
        <div className="flex flex-wrap gap-1 p-2">
          {poiTags.map((tagdata) => (
            <Badge
              key={tagdata.tagId}
               className={cn({
                 "dark:bg-green-300": !tagdata.excluded,
                 "dark:text-neutral-100": tagdata.excluded,
                 "bg-green-400": !tagdata.excluded,
                 "text-black": true,
               }, "cursor-pointer")}
              variant={tagdata.excluded ? "secondary" : "default"}
              onClick={(e) => {
                e.stopPropagation();
                mapStore.setTagBadgeOrder(poiTagsOrder);
                const currentExcludedTags = new Set(mapStore.excludedTags);
                if (mapStore.excludedTags.has(tagdata.tagId ?? -1)) {
                  currentExcludedTags.delete(tagdata.tagId ?? -1);
                  mapStore.setFilterExcludedTags(currentExcludedTags);
                } else {
                  currentExcludedTags.add(tagdata.tagId ?? -1);
                  mapStore.setFilterExcludedTags(currentExcludedTags);
                }
              }}
            >
              {tagdata.name}
            </Badge>
          ))}
        </div>
        <div className="flex flex-col gap-1 py-4">
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" asChild className="w-fit p-0">
              <a
                href={`https://www.google.com/maps?q=${poi.latitude},${poi.longitude}`}
                //if wanna open directions mode right away in G maps
                //href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poi.name)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation />
                Navigate
              </a>
            </Button>
            <Button variant="ghost" asChild className="w-fit p-0">
              <a
                href={`https://forms.gle/v9rBS4DWs4zKSmpc7`}
              >
                <MessageSquareWarning />
                Report
              </a>
            </Button>
          </div>
          <Button
            className="w-full truncate"
            size="sm"
            onClick={handleAddToItinerary}
            disabled={addPOIToItineraryMutation.isPending}
          >
            {addPOIToItineraryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add to Itinerary"
            )}
          </Button>
          <Button
            className="w-full truncate"
            variant="secondary"
            size="sm"
            onClick={handleStartItinerary}
          >
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
  const user = useUser().isSignedIn;
  const addrQuery = trpc.map.getAddress.useQuery({
    lat: pos.latitude,
    lng: pos.longitude,
  });
  if (addrQuery.isLoading || addrQuery.isFetching) {
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

  const addr = addrQuery.data;
  const coords = `Lat: ${pos.latitude.toFixed(2)}, Long: ${pos.longitude.toFixed(2)}`;
  const image = ""; //image placeholder

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
