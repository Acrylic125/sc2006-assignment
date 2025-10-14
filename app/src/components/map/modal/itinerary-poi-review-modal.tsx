import { useForm } from "react-hook-form";
import { ExtractOptions } from "./map-modal-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/server/client";
import { ThumbsDown, ThumbsUp, Upload, Loader2 } from "lucide-react";
import {
  DislikeButton,
  LikeButton,
} from "@/components/icons/like-dislike-icons";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

const POIReviewFormSchema = z.object({
  liked: z.boolean(),
  comment: z.string().max(255).optional(),
});

export function POIReviewDialog({
  options,
  close,
}: {
  options: ExtractOptions<"itinerary-poi-review">;
  close: () => void;
}) {
  const [isUpdate, setIsUpdate] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  
  const createReviewMutation = trpc.review.createReview.useMutation();
  const updateReviewMutation = trpc.review.updateReview.useMutation();
  const utils = trpc.useUtils();
  
  // Check if user already has a review for this POI
  const existingReviewQuery = trpc.review.getUserReview.useQuery({
    poiId: options.poiId,
  });

  const form = useForm<z.infer<typeof POIReviewFormSchema>>({
    resolver: zodResolver(POIReviewFormSchema),
    defaultValues: {
      liked: true, // Default to "like" button
      comment: "",
    },
  });

  // Set form values if user has existing review
  useEffect(() => {
    if (existingReviewQuery.data) {
      setIsUpdate(true);
      form.setValue("liked", existingReviewQuery.data.liked);
      form.setValue("comment", existingReviewQuery.data.comment || "");
      setUploadedImages(existingReviewQuery.data.images || []);
    }
  }, [existingReviewQuery.data, form]);

  const onSubmit = (data: z.infer<typeof POIReviewFormSchema>) => {
    const reviewData = {
      poiId: options.poiId,
      liked: data.liked,
      comment: data.comment,
      images: uploadedImages,
    };

    const mutation = isUpdate ? updateReviewMutation : createReviewMutation;
    
    mutation.mutate(reviewData, {
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
    // This will be implemented in the future when image storage is set up
    console.log("Image upload functionality to be implemented");
    alert("Image upload feature will be available soon!");
  };

  const currentMutation = isUpdate ? updateReviewMutation : createReviewMutation;

  if (existingReviewQuery.isLoading) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Review this Place!</DialogTitle>
          <DialogDescription>
            Let us know how you felt about it.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isUpdate ? "Update Your Review" : "Review this Place!"}
        </DialogTitle>
        <DialogDescription>
          {isUpdate 
            ? "Modify your existing review for this place."
            : "Let us know how you felt about it."
          }
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
                      variant={field.value ? "default" : "outline"}
                      onClick={() => field.onChange(true)}
                      className="flex-1"
                    >
                      <LikeButton active={field.value} /> Like
                    </Button>
                    <Button
                      type="button"
                      variant={!field.value ? "default" : "outline"}
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

          {currentMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to {isUpdate ? "update" : "create"} review.</AlertTitle>
              <AlertDescription>
                <p>{currentMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={currentMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={currentMutation.isPending}
              className="flex-1"
            >
              {currentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isUpdate ? "Updating..." : "Creating..."}
                </>
              ) : (
                isUpdate ? "Update Review" : "Submit Review"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
