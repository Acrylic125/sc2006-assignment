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
  const [currentItineraryId, setCurrentItineraryId] = useState<number | null>(null);
  const utils = trpc.useContext();
  
  const itinerariesQuery = trpc.itinerary.getAllItineraries.useQuery();
  const addToItineraryMutation = trpc.itinerary.addPOIToItinerary.useMutation({
    onSuccess: (data) => {
      setIsAdded(true);
      setCurrentItineraryId(data.itineraryId);
      utils.itinerary.getAllItineraries.invalidate();
    },
  });

  const removePOIMutation = trpc.itinerary.removePOIFromItinerary.useMutation({
    onSuccess: () => {
      setIsAdded(false);
      setCurrentItineraryId(null);
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

  const handleRemoveFromItinerary = async () => {
    if (!currentItineraryId) return;
    try {
      await removePOIMutation.mutateAsync({
        itineraryId: currentItineraryId,
        poiId,
      });
    } catch (error) {
      console.error("Failed to remove POI from itinerary:", error);
    }
  };

  if (isAdded) {
    return (
      <Button 
        variant="outline" 
        className="w-fit text-destructive hover:text-destructive"
        onClick={handleRemoveFromItinerary}
        disabled={removePOIMutation.isPending}
      >
        {removePOIMutation.isPending ? "Removing..." : "Remove from Itinerary"}
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
          close={async () => {
            setShowCreateModal(false);
            // The newly created itinerary will be the most recent one
            await utils.itinerary.getAllItineraries.invalidate();
            const itineraries = await utils.itinerary.getAllItineraries.fetch();
            
            // Get the most recently created itinerary (last in the list sorted by creation date)
            if (itineraries && itineraries.length > 0) {
              const newestItinerary = itineraries[itineraries.length - 1];
              setIsAdded(true);
              setCurrentItineraryId(newestItinerary.id);
            }
          }}
          poiId={poiId}
        />
      </Dialog>
    </>
  );
}