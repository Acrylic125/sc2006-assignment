"use client";

import { useMapStore } from "@/components/map/map-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, List, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  // PointerSensor,
  // TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { trpc } from "@/server/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMapModalStore } from "./modal/map-modal-store";
import { TouchSensor, MouseSensor } from "@/lib/dnd-kit";
import confetti from "canvas-confetti";
import { useRef } from "react";

export function ItineraryPOISortableItem({
  id,
  poi,
  isPrevChecked,
  isSelfChecked,
  className,
}: {
  id: number;
  poi: {
    id: number;
    name: string;
    checked: boolean;
    orderPriority: number;
  };
  isPrevChecked: boolean;
  isSelfChecked: boolean;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const modalStore = useMapModalStore(
    useShallow(({ setAction }) => {
      return {
        setAction,
      };
    })
  );
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId, setViewingPOI, setCurrentSidePanelTab, centerMapOnPOI }) => {
      return {
        viewingItineraryId,
        setViewingPOI,
        setCurrentSidePanelTab,
        centerMapOnPOI,
      };
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updateItineraryPOI = trpc.itinerary.updateItineraryPOI.useMutation();
  const removePOIFromItinerary = trpc.itinerary.removePOIFromItinerary.useMutation();
  const utils = trpc.useUtils();

  // Function to handle POI deletion
  const handleDeletePOI = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!mapStore.viewingItineraryId) return;
    
    if (confirm(`Are you sure you want to remove "${poi.name}" from this itinerary?`)) {
      removePOIFromItinerary.mutate(
        {
          itineraryId: mapStore.viewingItineraryId,
          poiId: poi.id,
        },
        {
          onSuccess: () => {
            // Invalidate and refetch the itinerary data
            utils.itinerary.getItinerary.invalidate({ id: mapStore.viewingItineraryId! });
            // Also invalidate the map search to refresh POI colors
            utils.map.search.invalidate();
          },
          onError: (error) => {
            console.error("Failed to remove POI from itinerary:", error);
          },
        }
      );
    }
  };

  // Function to handle POI click and center map
  const handlePOIClick = async (poiId: number) => {
    try {
      // Get POI details including coordinates
      const poiData = await utils.map.getPOI.fetch({ id: poiId });
      if (poiData) {
        // Center the map on the POI
        mapStore.centerMapOnPOI(poiData.latitude, poiData.longitude);
      }
      // Set the viewing POI to this POI
      mapStore.setViewingPOI({ type: "existing-poi", poiId: poiId });
      // Switch to the place tab to show the POI details
      mapStore.setCurrentSidePanelTab("place");
    } catch (error) {
      console.error("Failed to get POI data:", error);
      // Still switch to the POI view even if centering fails
      mapStore.setViewingPOI({ type: "existing-poi", poiId: poiId });
      mapStore.setCurrentSidePanelTab("place");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex flex-row gap-2 items-center",
        {
          "bg-secondary": isDragging,
        },
        className
      )}
    >
      <div className="w-8 flex flex-col items-center justify-center">
        <div
          className={cn("h-4 w-0.5", {
            "bg-primary": isPrevChecked,
            "bg-neutral-300 dark:bg-neutral-700": !isPrevChecked,
          })}
        />
        <Button
          variant={poi.checked ? "default" : "outline"}
          className="border-2 border-neutral-300 dark:border-neutral-700 rounded-md p-2 w-8 h-8"
          data-no-dnd="true"
          disabled={updateItineraryPOI.isPending}
          ref={buttonRef}
          onClick={(e) => {
            e.stopPropagation();
            if (!mapStore.viewingItineraryId) return;

            const buttonRect = buttonRef.current?.getBoundingClientRect();
            if (!buttonRect) return;
            const x = buttonRect.x / window.innerWidth;
            const y = buttonRect.y / window.innerHeight;

            updateItineraryPOI.mutate(
              {
                itineraryId: mapStore.viewingItineraryId,
                poiId: poi.id,
                checked: !poi.checked,
              },
              {
                onSuccess: (data, input) => {
                  // Get current data for the itinerary.
                  const itinerary = utils.itinerary.getItinerary.getData({
                    id: input.itineraryId,
                  });
                  if (!itinerary) return;
                  // Update the checked status of the poi.
                  // Deep clone the itinerary.
                  const newItinerary = JSON.parse(
                    JSON.stringify(itinerary)
                  ) as typeof itinerary;
                  const poi = newItinerary.pois.find(
                    (p) => p.id === input.poiId
                  );
                  if (!poi) return;
                  poi.checked = !poi.checked;
                  // Update the itinerary.
                  utils.itinerary.getItinerary.setData(
                    {
                      id: input.itineraryId,
                    },
                    newItinerary
                  );

                  // If the poi is checked, show confetti.
                  if (poi.checked) {
                    confetti({
                      particleCount: 48,
                      spread: 40,
                      origin: {
                        x: x,
                        y: y,
                      },
                    });

                    // If no review, show the review modal.
                    if (data) return;
                    modalStore.setAction({
                      type: "itinerary-poi-review",
                      options: {
                        poiId: poi.id,
                      },
                    });
                  }
                },
              }
            );
          }}
        >
          <Check
            className={cn("stroke-3 size-4", {
              "text-background": poi.checked,
              "text-neutral-300 dark:text-neutral-700": !poi.checked,
            })}
          />
        </Button>
        <div
          className={cn("h-4 w-0.5", {
            "bg-primary": isSelfChecked,
            "bg-neutral-300 dark:bg-neutral-700": !isSelfChecked,
          })}
        />
      </div>

      {/* Clickable POI content */}
      <div 
        className="flex flex-row items-center h-full flex-1 cursor-pointer hover:bg-accent/50 rounded-sm px-2 py-1 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          handlePOIClick(poi.id);
        }}
      >
        <h3 className="select-none flex-1">{poi.name}</h3>
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={handleDeletePOI}
        disabled={removePOIFromItinerary.isPending}
        data-no-dnd="true"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function ViewItineraryPanel() {
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId }) => {
      return {
        viewingItineraryId,
      };
    })
  );
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500, // 500ms long press for touch devices
        tolerance: 5,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 300, // 300ms long press for mouse
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const utils = trpc.useUtils();
  const getItineraryQuery = trpc.itinerary.getItinerary.useQuery(
    {
      id: mapStore.viewingItineraryId ?? 0,
    },
    {
      enabled: mapStore.viewingItineraryId !== null,
    }
  );
  const updateItineraryPOIOrderMutation =
    trpc.itinerary.updateItineraryPOIOrder.useMutation({
      onSuccess: (data, input) => {
        // Update the itinerary data in the cache
        utils.itinerary.getItinerary.setData(
          {
            id: input.itineraryId,
          },
          data
        );
      },
      onError: (error) => {
        console.error("Failed to update POI order:", error);
      },
    });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const itinerary = getItineraryQuery.data;
      if (!itinerary) return;
      const itineraryId = mapStore.viewingItineraryId;
      if (!itineraryId) return;

      const oldIndex = itinerary.pois.findIndex((poi) => poi.id === active.id);
      const newIndex = itinerary.pois.findIndex((poi) => poi.id === over.id);

      if (oldIndex === newIndex) return;
      if (oldIndex === -1 || newIndex === -1) return;

      const updatedPOIs = arrayMove(itinerary.pois, oldIndex, newIndex);
      updatedPOIs.forEach((poi, index) => {
        poi.orderPriority = index + 1; // Use 1-based ordering to match existing data
      });

      // Optimistically update the cache
      utils.itinerary.getItinerary.setData(
        { id: itineraryId },
        { ...itinerary, pois: updatedPOIs }
      );

      // Send the update to the server
      updateItineraryPOIOrderMutation.mutate({
        itineraryId,
        pois: updatedPOIs.map((poi) => ({ id: poi.id, orderPriority: poi.orderPriority })),
      });
    }
  };

  if (getItineraryQuery.isLoading) {
    return (
      <div className="w-full flex flex-col gap-2 py-16 px-8 lg:px-1">
        <h2 className="text-lg font-bold">
          <Skeleton className="w-24 h-6" />
        </h2>
        <div className="w-full flex flex-col">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
          </div>
        </div>
      </div>
    );
  }

  const itinerary = getItineraryQuery.data;
  if (
    mapStore.viewingItineraryId === null ||
    !itinerary ||
    getItineraryQuery.error
  ) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-14 px-4 md:py-16">
        <div className="w-fit lg:w-full flex flex-col gap-2 items-center justify-center p-4 bg-secondary border-border border rounded-md">
          <List className="size-6 stroke-pink-50" />
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-center">
              No initerary selected!
            </h3>
            <p className="text-muted-foreground text-center text-sm">
              Select an itinerary to get started.
            </p>
          </div>
          {getItineraryQuery.error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {getItineraryQuery.error.message}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }

  const isLastPOIReviewed =
    itinerary.pois.length === 0 ||
    itinerary.pois[itinerary.pois.length - 1].checked;

  return (
    <div className="w-full flex flex-col gap-2 py-16 px-8 lg:px-1">
      <h2 className="text-lg font-bold">{itinerary.name}</h2>
      <div className="w-full flex flex-col">
        <div className="flex flex-row items-center">
          <div className="w-8 flex flex-col items-center">
            <div className="bg-primary rounded-full w-4 h-4"></div>
            <div className="h-4 w-0.5 bg-primary" />
          </div>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={itinerary.pois.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
            // DO NOT allow dragging if the mutation is pending
            disabled={updateItineraryPOIOrderMutation.isPending}
          >
            {itinerary.pois.map((poi, i) => {
              const isPrevChecked = i <= 0 || itinerary.pois[i - 1].checked;

              return (
                <ItineraryPOISortableItem
                  key={poi.id}
                  id={poi.id}
                  poi={poi}
                  isPrevChecked={isPrevChecked}
                  isSelfChecked={poi.checked}
                  className={cn({
                    "opacity-50": updateItineraryPOIOrderMutation.isPending,
                  })}
                />
              );
            })}
          </SortableContext>
        </DndContext>

        <div className="flex flex-row items-center">
          <div className="w-8 flex flex-col items-center">
            <div
              className={cn("h-4 w-0.5", {
                "bg-primary": isLastPOIReviewed,
                "bg-neutral-300 dark:bg-neutral-700": !isLastPOIReviewed,
              })}
            />
            <div
              className={cn("rounded-full w-4 h-4", {
                "bg-primary": isLastPOIReviewed,
                "bg-neutral-300 dark:bg-neutral-700": !isLastPOIReviewed,
              })}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
