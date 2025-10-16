"use client";

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
import { useState } from "react";

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
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deleteReviewMutation = trpc.review.deleteReview.useMutation();
  const utils = trpc.useUtils();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      await deleteReviewMutation.mutateAsync({ reviewId });
      
      // Invalidate queries to refresh data
      await Promise.all([
        utils.review.getReviews.invalidate({ poiId }),
        utils.review.getUserReview.invalidate({ poiId }),
      ]);
      
      onSuccess?.();
      close();
    } catch (error) {
      console.error("Failed to delete review:", error);
      // Error handling is managed by the mutation's onError if needed
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          Delete Review
        </DialogTitle>
        <DialogDescription>
          Are you sure you want to delete your review? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
        <Button
          variant="outline"
          onClick={close}
          disabled={isDeleting}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full sm:w-auto"
        >
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Review
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}