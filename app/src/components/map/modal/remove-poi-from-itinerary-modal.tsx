import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/server/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { useCallback } from "react";

export function RemovePOIFromItineraryModal({
  itineraryId,
  poiId,
  poiName,
  close,
}: {
  itineraryId: number;
  poiId: number;
  poiName: string;
  close: () => void;
}) {
  const utils = trpc.useUtils();
  const removePOIFromItinerary =
    trpc.itinerary.removePOIFromItinerary.useMutation({
      onSuccess: () => {
        // Invalidate specific itinerary and map search queries
        utils.itinerary.getItinerary.invalidate({ id: itineraryId });
        utils.map.search.invalidate();
        close();
      },
      onError: (error) => {
        console.error("Failed to remove POI from itinerary:", error);
      },
    });

  const handleRemove = () => {
    removePOIFromItinerary.mutate({
      itineraryId,
      poiId,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Remove POI from Itinerary
        </DialogTitle>
        <DialogDescription>
          This will remove the place from your itinerary. You can add it back
          later if needed.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm">
            Are you sure you want to remove{" "}
            <span className="font-semibold">{`"${poiName}"`}</span> from this
            itinerary?
          </p>
        </div>

        {removePOIFromItinerary.isError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to remove POI from itinerary.</AlertTitle>
            <AlertDescription>
              <p>{removePOIFromItinerary.error.message}</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={removePOIFromItinerary.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={removePOIFromItinerary.isPending}
            className="flex-1"
          >
            {removePOIFromItinerary.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove from Itinerary"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
