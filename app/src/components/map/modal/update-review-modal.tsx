import { useForm } from "react-hook-form";
import { ExtractOptions } from "./map-modal-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DialogContent,
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
import { useUploadImage } from "@/app/api/uploadthing/client";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import { ScrollArea } from "@/components/ui/scroll-area";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

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
  };
}) {
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

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Update Your Review</DialogTitle>
        <DialogDescription>
          Modify your existing review for this place.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex flex-col gap-4">
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
          </div>

          <DialogFooter className="flex sm:flex-col flex-col gap-4 w-full sm:justify-start">
            {updateReviewMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to update review.</AlertTitle>
                <AlertDescription>
                  <p>{updateReviewMutation.error.message}</p>
                </AlertDescription>
              </Alert>
            )}
            <div className="w-full flex flex-row gap-2">
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
