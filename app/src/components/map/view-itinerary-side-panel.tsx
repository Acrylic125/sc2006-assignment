"use client";

import { useMapStore } from "@/components/map/map-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, List } from "lucide-react";
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

export function ItineraryPOISortableItem({
  id,
  poi,
  isPrevChecked,
  isNextChecked,
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
  isNextChecked: boolean;
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
          onClick={(e) => {
            e.stopPropagation();
            modalStore.setAction({
              type: "itinerary-poi-review",
              options: {
                poiId: poi.id,
              },
            });
            console.log("clicked");
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
            "bg-primary": isNextChecked,
            "bg-neutral-300 dark:bg-neutral-700": !isNextChecked,
          })}
        />
      </div>
      <div className="flex flex-row items-center h-full flex-1">
        <h3>{poi.name}</h3>
      </div>
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
    // useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(MouseSensor),
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
        // We treat the itinerary as our single source of truth
        // for the itinerary data.
        utils.itinerary.getItinerary.setData(
          {
            id: input.itineraryId,
          },
          data
        );
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

      const pois = arrayMove(itinerary.pois, oldIndex, newIndex);
      pois.forEach((poi, i) => {
        poi.orderPriority = i;
      });

      utils.itinerary.getItinerary.setData(
        {
          id: itineraryId,
        },
        {
          ...itinerary,
          pois: pois,
        }
      );
      updateItineraryPOIOrderMutation.mutate(
        {
          itineraryId: itineraryId,
          pois: pois.map((poi) => ({
            id: poi.id,
            orderPriority: poi.orderPriority,
          })),
        },
        {
          onError: (error) => {
            console.error(error);
            utils.itinerary.getItinerary.setData(
              {
                id: itineraryId,
              },
              itinerary
            );
          },
        }
      );
    }
  };

  // const poi = {
  //   name: "Marina Bay Sands",
  //   description: "Marina Bay Sands is a hotel and casino located in Singapore.",
  //   image: "/example.png",
  //   latitude: 1.2834,
  //   longitude: 103.8607,
  // };

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
              const isNextChecked = poi.checked;

              return (
                <ItineraryPOISortableItem
                  key={poi.id}
                  id={poi.id}
                  poi={poi}
                  isPrevChecked={isPrevChecked}
                  isNextChecked={isNextChecked}
                  // isSelfChecked={isSelfChecked}
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
  // return <></>;

  // return (
  //   <div className="w-full flex flex-col">
  //     <div className="w-full aspect-[4/3] relative">
  //       <Image src={poi.image} alt={poi.name} fill className="object-cover" />
  //     </div>
  //     <div className="flex flex-col p-1">
  //       <h1 className="text-base font-bold">{poi.name}</h1>
  //       <p className="text-sm text-muted-foreground">{poi.description}</p>
  //       <div className="flex flex-col gap-1 py-4">
  //         <Button variant="ghost" asChild className="w-fit p-0">
  //           <a
  //             href={`https://www.google.com/maps?q=${poi.latitude},${poi.longitude}`}
  //           >
  //             <Navigation />
  //             Navigate
  //           </a>
  //         </Button>
  //         <Button className="w-full truncate" size="sm">
  //           Add to Itinerary
  //         </Button>
  //         <Button className="w-full truncate" variant="secondary" size="sm">
  //           Start Itinerary
  //         </Button>
  //       </div>
  //       <ViewPOIReviews />
  //     </div>
  //   </div>
  // );
}
