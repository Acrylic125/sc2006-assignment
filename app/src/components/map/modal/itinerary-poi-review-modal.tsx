import { ExtractOptions } from "./map-modal-store";
import { trpc } from "@/server/client";
import { Loader2 } from "lucide-react";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateReviewDialog } from "./create-review-modal";
import { UpdateReviewDialog } from "./update-review-modal";
import { Skeleton } from "@/components/ui/skeleton";

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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Review this Place!</DialogTitle>
          <DialogDescription>
            Let us know how you felt about it.
          </DialogDescription>
        </DialogHeader>
        <Skeleton className="w-full aspect-video" />
      </DialogContent>
    );
  }

  // If user has an existing review, show update dialog
  if (existingReviewQuery.data) {
    return (
      <UpdateReviewDialog
        options={options}
        close={close}
        existingReview={existingReviewQuery.data}
      />
    );
  }

  // Otherwise, show create dialog
  return <CreateReviewDialog options={options} close={close} />;
}
