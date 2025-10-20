import { useForm } from "react-hook-form";
import { ExtractOptions } from "./map-modal-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/server/client";
import { Upload, Loader2 } from "lucide-react";
import {
  DislikeButton,
  LikeButton,
} from "@/components/icons/like-dislike-icons";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

const UpdateReviewFormSchema = z.object({
  liked: z.boolean(),
  comment: z.string().max(255).optional(),
});

export function UpdateReviewDialog({
  options,
  close,
  existingReview,
}: {
  options: ExtractOptions<"itinerary-poi-review">;
  close: () => void;
  existingReview: {
    liked: boolean;
    comment: string | null;
    images: string[];
  };
}) {
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    existingReview.images
  );

  const updateReviewMutation = trpc.review.updateReview.useMutation();
  const utils = trpc.useUtils();

  const form = useForm<z.infer<typeof UpdateReviewFormSchema>>({
    resolver: zodResolver(UpdateReviewFormSchema),
    defaultValues: {
      liked: existingReview.liked,
      comment: existingReview.comment ?? "",
    },
  });

  const onSubmit = (data: z.infer<typeof UpdateReviewFormSchema>) => {
    const reviewData = {
      poiId: options.poiId,
      liked: data.liked,
      comment: data.comment,
      images: uploadedImages,
    };

    updateReviewMutation.mutate(reviewData, {
      onSuccess: () => {
        // Invalidate queries to refresh data
        utils.review.getReviews.invalidate({ poiId: options.poiId });
        utils.review.getUserReview.invalidate({ poiId: options.poiId });
        close();
      },
    });
  };

  const handleImageUpload = () => {
    // TODO: Implement image upload functionality
    console.log("Image upload functionality to be implemented");
    alert("Image upload feature will be available soon!");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Update Your Review</DialogTitle>
        <DialogDescription>
          Modify your existing review for this place.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="liked"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Did you like this place?</FormLabel>
                <FormControl>
                  <div className="flex flex-row gap-2">
                    <Button
                      type="button"
                      variant={field.value ? "secondary" : "outline"}
                      onClick={() => field.onChange(true)}
                      className="flex-1"
                    >
                      <LikeButton active={field.value} /> Like
                    </Button>
                    <Button
                      type="button"
                      variant={!field.value ? "secondary" : "outline"}
                      onClick={() => field.onChange(false)}
                      className="flex-1"
                    >
                      <DislikeButton active={!field.value} /> Dislike
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comment (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Share your thoughts about this place..."
                    className="min-h-[80px]"
                    maxLength={255}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  {field.value?.length || 0}/255 characters
                </p>
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Photos (Optional)</FormLabel>
            <Button
              type="button"
              variant="outline"
              onClick={handleImageUpload}
              className="w-full"
              disabled
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Photos (Coming Soon)
            </Button>
            <p className="text-sm text-muted-foreground">
              Photo upload functionality will be available in a future update.
            </p>
          </div>

          {updateReviewMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to update review.</AlertTitle>
              <AlertDescription>
                <p>{updateReviewMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-row gap-2 w-full sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={updateReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateReviewMutation.isPending}>
              {updateReviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
