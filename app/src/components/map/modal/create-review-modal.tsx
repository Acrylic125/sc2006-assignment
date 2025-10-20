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
import { useState } from "react";

const CreateReviewFormSchema = z.object({
  liked: z.boolean(),
  comment: z.string().max(255).optional(),
});

export function CreateReviewDialog({
  options,
  close,
}: {
  options: ExtractOptions<"itinerary-poi-review">;
  close: () => void;
}) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const createReviewMutation = trpc.review.createReview.useMutation();
  const utils = trpc.useUtils();

  const form = useForm<z.infer<typeof CreateReviewFormSchema>>({
    resolver: zodResolver(CreateReviewFormSchema),
    defaultValues: {
      liked: true, // Default to "like" button
      comment: "",
    },
  });

  const onSubmit = (data: z.infer<typeof CreateReviewFormSchema>) => {
    const reviewData = {
      poiId: options.poiId,
      liked: data.liked,
      comment: data.comment,
      images: uploadedImages,
    };

    createReviewMutation.mutate(reviewData, {
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
        <DialogTitle>Review this Place!</DialogTitle>
        <DialogDescription>
          Let us know how you felt about it.
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

          {createReviewMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to create review.</AlertTitle>
              <AlertDescription>
                <p>{createReviewMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-row gap-2 w-full sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={createReviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createReviewMutation.isPending}>
              {createReviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Review"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
