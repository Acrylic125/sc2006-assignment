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


export function ViewPOIReviews({ poiId }: { poiId: number }) {
  const auth = useAuth();

  // Get reviews from the backend
  const reviewsQuery = trpc.review.getReviews.useQuery({ poiId });
  const userReviewQuery = trpc.review.getUserReview.useQuery(
    { poiId },
    { enabled: !!auth.isSignedIn }
  );

  // Delete review mutation
  const deleteReviewMutation = trpc.review.deleteReview.useMutation();
  const utils = trpc.useUtils();

  const modalStore = useMapModalStore(
    useShallow(({ setAction }) => {
      return {
        setAction,
      };
    })
  );

  const handleDeleteReview = (reviewId: number) => {
    if (confirm("Are you sure you want to delete your review?")) {
      deleteReviewMutation.mutate({ reviewId }, {
        onSuccess: () => {
          // Invalidate queries to refresh data
          utils.review.getReviews.invalidate({ poiId });
          utils.review.getUserReview.invalidate({ poiId });
        },
        onError: (error) => {
          alert(`Failed to delete review: ${error.message}`);
        }
      });
    }
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
                      <AvatarImage src={review.user?.imageUrl || "https://github.com/shadcn.png"} />
                      <AvatarFallback>
                        {isCurrentUser ? "You" : (review.user?.firstName?.[0] || review.userId.slice(0, 2).toUpperCase())}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {isCurrentUser 
                        ? "You" 
                        : (review.user?.firstName && review.user?.lastName)
                          ? `${review.user.firstName} ${review.user.lastName}`
                          : review.user?.username || review.userId
                      }
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
                        disabled={deleteReviewMutation.isPending}
                        className="text-red-500 hover:text-red-700 p-1 h-auto"
                      >
                        {deleteReviewMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Delete"
                        )}
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
  const poiQuery = trpc.map.getPOI.useQuery(
    { id: poiId ?? 0 },
    {
      enabled: poiId !== null,
    }
  );

  // Get user's itineraries
  const itinerariesQuery = trpc.itinerary.getAllItineraries.useQuery();
  
  // Mutation for adding POI to itinerary
  const addPOIToItineraryMutation = trpc.itinerary.addPOIToItinerary.useMutation();
  
  // TRPC utilities for cache invalidation
  const utils = trpc.useUtils();
  
  // Map store for managing state
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId, setViewingItineraryId, setCurrentSidePanelTab }) => {
      return {
        viewingItineraryId,
        setViewingItineraryId,
        setCurrentSidePanelTab,
      };
    })
  );
  
  // Modal store for showing modals
  const modalStore = useMapModalStore();

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

  if (poi === null || poi === undefined) {
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
    console.log("Currently selected itinerary ID:", mapStore.viewingItineraryId);
    
    // Check if there's a currently selected itinerary
    if (mapStore.viewingItineraryId !== null) {
      console.log("Adding to currently selected itinerary ID:", mapStore.viewingItineraryId);
      addPOIToItineraryMutation.mutate({
        itineraryId: mapStore.viewingItineraryId,
        poiId: poiId,
      }, {
        onSuccess: (data) => {
          console.log("Successfully added POI to itinerary:", data);
          // Switch to the itinerary panel
          mapStore.setCurrentSidePanelTab("itinerary");
          // Invalidate the itinerary query to refresh the data
          utils.itinerary.getItinerary.invalidate({ id: mapStore.viewingItineraryId! });
          // Also invalidate the map search to refresh POI colors
          utils.map.search.invalidate();
          // Invalidate all itineraries to update the list
          utils.itinerary.getAllItineraries.invalidate();
        },
        onError: (error) => {
          console.error("Failed to add POI to itinerary:", error);
          // Check if the error is because the POI is already in the itinerary
          if (error.message && error.message.includes("already in this itinerary")) {
            console.log("POI is already in this itinerary, switching to itinerary panel to show current state");
          }
          // Even if there's an error (like POI already in itinerary), 
          // still switch to the itinerary panel to show the current state
          mapStore.setCurrentSidePanelTab("itinerary");
          // Invalidate queries to refresh the data
          utils.itinerary.getItinerary.invalidate({ id: mapStore.viewingItineraryId! });
          utils.map.search.invalidate();
          utils.itinerary.getAllItineraries.invalidate();
        }
      });
    } 
    // If no itinerary is currently selected, but there are itineraries, add to the first one
    else if (itinerariesQuery.data && itinerariesQuery.data.length > 0) {
      console.log("No itinerary selected, adding to first itinerary ID:", itinerariesQuery.data[0].id);
      addPOIToItineraryMutation.mutate({
        itineraryId: itinerariesQuery.data[0].id,
        poiId: poiId,
      }, {
        onSuccess: (data) => {
          console.log("Successfully added POI to itinerary:", data);
          // Set the current itinerary as the viewing itinerary
          mapStore.setViewingItineraryId(itinerariesQuery.data[0].id);
          // Switch to the itinerary panel
          mapStore.setCurrentSidePanelTab("itinerary");
          // Invalidate the itinerary query to refresh the data
          utils.itinerary.getItinerary.invalidate({ id: itinerariesQuery.data[0].id });
          // Also invalidate the map search to refresh POI colors
          utils.map.search.invalidate();
          // Invalidate all itineraries to update the list
          utils.itinerary.getAllItineraries.invalidate();
        },
        onError: (error) => {
          console.error("Failed to add POI to itinerary:", error);
          // Check if the error is because the POI is already in the itinerary
          if (error.message && error.message.includes("already in this itinerary")) {
            console.log("POI is already in this itinerary, switching to itinerary panel to show current state");
          }
          // Even if there's an error (like POI already in itinerary), 
          // still switch to the itinerary panel to show the current state
          mapStore.setViewingItineraryId(itinerariesQuery.data[0].id);
          mapStore.setCurrentSidePanelTab("itinerary");
          // Invalidate queries to refresh the data
          utils.itinerary.getItinerary.invalidate({ id: itinerariesQuery.data[0].id });
          utils.map.search.invalidate();
          utils.itinerary.getAllItineraries.invalidate();
        }
      });
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
          <Image
            src={`https://${poi.images[0]}`}
            alt={poi.name}
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
        <h1 className="text-base font-bold">{poi.name}</h1>
        <p className="text-sm text-muted-foreground">{poi.description}</p>
        <div className="flex flex-col gap-1 py-4">
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
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    images: string[];
  };
}) {
  // TODO: Implement this.
  return <></>;
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
  }
  if (mapStore.viewingPOI?.type === "new-poi") {
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
