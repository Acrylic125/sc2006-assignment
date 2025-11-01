"use client";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { trpc } from "@/server/client";
import { useState } from "react";
import { Dialog } from "../ui/dialog";

import { CreateItineraryDialog } from "../map/modal/create-itinerary-modal";

interface AddToItineraryButtonProps {
  poiId: number;
}

export function AddToItineraryButton({ poiId }: AddToItineraryButtonProps) {
  const [isAdded, setIsAdded] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const utils = trpc.useContext();
  
  const itinerariesQuery = trpc.itinerary.getAllItineraries.useQuery();
  const addToItineraryMutation = trpc.itinerary.addPOIToItinerary.useMutation({
    onSuccess: () => {
      setIsAdded(true);
      utils.itinerary.getAllItineraries.invalidate();
    },
  });

  const handleAddToItinerary = async (itineraryId: number) => {
    try {
      await addToItineraryMutation.mutateAsync({
        itineraryId,
        poiId,
      });
    } catch (error) {
      console.error("Failed to add POI to itinerary:", error);
    }
  };

  if (isAdded) {
    return (
      <Button variant="outline" disabled className="w-fit">
        Added to Itinerary
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-fit">
            Add to Itinerary
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Select Itinerary</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {itinerariesQuery.data?.map((itinerary) => (
            <DropdownMenuItem
              key={itinerary.id}
              onClick={() => handleAddToItinerary(itinerary.id)}
            >
              {itinerary.name}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Itinerary
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <CreateItineraryDialog 
          close={() => {
            setShowCreateModal(false);
            setIsAdded(true); // Set isAdded to true when a new itinerary is created with the POI
            utils.itinerary.getAllItineraries.invalidate();
          }}
          poiId={poiId}
        />
      </Dialog>
    </>
  );
}