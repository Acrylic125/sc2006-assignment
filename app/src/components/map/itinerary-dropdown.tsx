"use client";

import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useMapStore } from "./map-store";
import { useShallow } from "zustand/react/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipsis, Pen, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/server/client";
import { useMapModalStore } from "./modal/map-modal-store";

export function ItineraryDropdown() {
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId, setViewingItineraryId }) => {
      return {
        viewingItineraryId,
        setViewingItineraryId,
      };
    })
  );
  const modalStore = useMapModalStore();
  const itinerariesQuery = trpc.itinerary.getAllItineraries.useQuery();

  const handleDeleteItinerary = (itineraryId: number, itineraryName: string) => {
    modalStore.setAction({
      type: "delete-itinerary",
      options: {
        itineraryId,
        itineraryName,
      },
    });
  };

  const handleRenameItinerary = (itineraryId: number, currentName: string) => {
    modalStore.setAction({
      type: "rename-itinerary",
      options: {
        itineraryId,
        currentName,
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-36 md:w-40 lg:w-52">
          {mapStore.viewingItineraryId ? (
            <span className="truncate">
              {
                itinerariesQuery.data?.find(
                  (itinerary) => itinerary.id === mapStore.viewingItineraryId
                )?.name
              }
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              No Intinerary Selected
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Itineraries</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {itinerariesQuery.data?.map((itinerary) => (
          <div key={itinerary.id} className="relative">
            <Button
              onClick={() => {
                if (mapStore.viewingItineraryId === itinerary.id) {
                  mapStore.setViewingItineraryId(null);
                } else {
                  mapStore.setViewingItineraryId(itinerary.id);
                }
              }}
              className="w-full px-2 flex flex-row items-center justify-start pr-20"
              variant={
                mapStore.viewingItineraryId === itinerary.id
                  ? "default"
                  : "ghost"
              }
            >
              {itinerary.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("absolute top-0 right-0", {
                    "text-background":
                      mapStore.viewingItineraryId === itinerary.id,
                    "text-foreground":
                      mapStore.viewingItineraryId !== itinerary.id,
                  })}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => handleRenameItinerary(itinerary.id, itinerary.name)}
                >
                  <Pen className="size-3" /> 
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  variant="destructive"
                  onClick={() => handleDeleteItinerary(itinerary.id, itinerary.name)}
                >
                  <Trash2 className="size-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-2"
          onClick={() => {
            modalStore.setAction({
              type: "create-itinerary",
              options: {
                longitude: 0,
                latitude: 0,
              },
            });
          }}
        >
          <Plus /> Create Itinerary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
