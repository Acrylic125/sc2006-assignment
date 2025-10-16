import { ExtractOptions } from "./map-modal-store";
import { trpc } from "@/server/client";
import { Loader2 } from "lucide-react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateReviewDialog } from "./create-review-modal";
import { UpdateReviewDialog } from "./update-review-modal";

export function POIReviewDialog({
  options,
  close,
}: {
  options: ExtractOptions<"itinerary-poi-review">;
  close: () => void;
}) {
  // Check if user already has a review for this POI
  const existingReviewQuery = trpc.review.getUserReview.useQuery({
    poiId: options.poiId,
  });

  if (existingReviewQuery.isLoading) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Loading...</DialogTitle>
          <DialogDescription>
            Checking for existing review...
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </>
    );
  }

  // If user has an existing review, show update dialog
  if (existingReviewQuery.data) {
    return <UpdateReviewDialog options={options} close={close} />;
  }

  // Otherwise, show create dialog
  return <CreateReviewDialog options={options} close={close} />;
}
