import {
  DialogContent,
  DialogDescription,
  DialogFooter,
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
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
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
            <span className="font-semibold">{`"${itineraryName}"`}</span>? This
            cannot be undone.
          </p>
        </div>

        <DialogFooter className="flex flex-col gap-2 w-full sm:justify-start">
          {deleteItineraryMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to delete itinerary.</AlertTitle>
              <AlertDescription>
                <p>{deleteItineraryMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}
          <div className="w-full flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={deleteItineraryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteItineraryMutation.isPending}
            >
              {deleteItineraryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </div>
        </DialogFooter>
      </div>
    </DialogContent>
  );
}
