"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/server/client";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteReviewModalProps {
  reviewId: number;
  poiId: number;
  close: () => void;
  onSuccess?: () => void;
}

export function DeleteReviewModal({
  reviewId,
  poiId,
  close,
  onSuccess,
}: DeleteReviewModalProps) {
  const utils = trpc.useUtils();

  const deleteReviewMutation = trpc.review.deleteReview.useMutation({
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await Promise.all([
        utils.review.getReviews.invalidate({ poiId }),
        utils.review.getUserReview.invalidate({ poiId }),
      ]);

      onSuccess?.();
      close();
    },
    onError: (error) => {
      console.error("Failed to delete review:", error);
    },
  });

  const handleDelete = () => {
    deleteReviewMutation.mutate({ reviewId });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          Delete Review
        </DialogTitle>
        <DialogDescription>
          Are you sure you want to delete your review? This action cannot be
          undone.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter className="flex sm:flex-col gap-4 w-full sm:justify-start">
        {deleteReviewMutation.isError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to delete review.</AlertTitle>
            <AlertDescription>
              <p>{deleteReviewMutation.error.message}</p>
            </AlertDescription>
          </Alert>
        )}
        <div className="w-full flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={close}
            disabled={deleteReviewMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteReviewMutation.isPending}
          >
            {deleteReviewMutation.isPending ? (
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
    </DialogContent>
  );
}
