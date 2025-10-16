import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/server/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { useMapStore } from "../map-store";
import { useShallow } from "zustand/react/shallow";

export function DeleteItineraryModal({
  itineraryId,
  itineraryName,
  close,
}: {
  itineraryId: number;
  itineraryName: string;
  close: () => void;
}) {
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId, setViewingItineraryId }) => ({
      viewingItineraryId,
      setViewingItineraryId,
    }))
  );

  const utils = trpc.useUtils();
  const deleteItineraryMutation = trpc.itinerary.deleteItinerary.useMutation({
    onSuccess: () => {
      // If the deleted itinerary was currently selected, clear the selection
      if (mapStore.viewingItineraryId === itineraryId) {
        mapStore.setViewingItineraryId(null);
      }
      utils.itinerary.getAllItineraries.invalidate();
      close();
    },
    onError: (error) => {
      console.error("Failed to delete itinerary:", error);
    },
  });

  const handleDelete = () => {
    deleteItineraryMutation.mutate({ id: itineraryId });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Delete Itinerary
        </DialogTitle>
        <DialogDescription>
          This action cannot be undone. This will permanently delete your
          itinerary and all associated data.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{`"${itineraryName}"`}</span>?
          </p>
        </div>

        {deleteItineraryMutation.isError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to delete itinerary.</AlertTitle>
            <AlertDescription>
              <p>{deleteItineraryMutation.error.message}</p>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={deleteItineraryMutation.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteItineraryMutation.isPending}
            className="flex-1"
          >
            {deleteItineraryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Itinerary"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
