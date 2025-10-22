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
import { useUploadImage } from "@/app/api/uploadthing/client";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

const UpdateReviewFormSchema = z.object({
  liked: z.boolean(),
  comment: z.string().max(255).optional(),
  images: z.array(z.string()).optional(),
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
  const [filePending, setFilePending] = useState(false);

  const updateReviewMutation = trpc.review.updateReview.useMutation();
  const utils = trpc.useUtils();
  const { uploadImage } = useUploadImage();

  // Get the existing review
  const existingReviewQuery = trpc.review.getUserReview.useQuery({
    poiId: options.poiId,
  });

  const form = useForm<z.infer<typeof UpdateReviewFormSchema>>({
    resolver: zodResolver(UpdateReviewFormSchema),
    defaultValues: {
      liked: true,
      comment: "",
      images: [],
    },
  });

  // Set form values when existing review data loads
  useEffect(() => {
    if (existingReviewQuery.data) {
      form.setValue("liked", existingReviewQuery.data.liked);
      form.setValue("comment", existingReviewQuery.data.comment || "");
      form.setValue("images", existingReviewQuery.data.images || []);
    }
  }, [existingReviewQuery.data, form]);

  const onSubmit = (data: z.infer<typeof UpdateReviewFormSchema>) => {
    const reviewData = {
      poiId: options.poiId,
      liked: data.liked,
      comment: data.comment,
      images: data.images ?? [],
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

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadImage(file);
      return result.ufsUrl;
    } catch (err) {
      console.error("Upload failed", err);
      throw err;
    }
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
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

          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Photos (Optional)</FormLabel>
                <FormControl>
                  <FilePond
                    allowMultiple={true}
                    maxFiles={3}
                    name="images"
                    acceptedFileTypes={["image/*"]}
                    labelIdle='Drag & Drop your photos or <span class="filepond--label-action">Browse</span>'
                    onaddfilestart={() => setFilePending(true)}
                    onprocessfiles={() => setFilePending(false)}
                    server={{
                      process: async (
                        fieldName,
                        file,
                        metadata,
                        load,
                        error,
                        progress,
                        abort
                      ) => {
                        try {
                          // Convert filepond actualFile to File
                          const realFile = new File([file], file.name, {
                            type: file.type,
                            lastModified: file.lastModified ?? Date.now(),
                          });

                          const result = await handleUpload(realFile);
                          if (!result) {
                            error("Upload failed");
                            return;
                          }

                          // Add image to form
                          const images = [
                            ...(form.getValues("images") ?? []),
                            result,
                          ];
                          form.setValue("images", images, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          load(result); // Tell FilePond it's done
                        } catch (err) {
                          console.error("Filepond upload failed", err);
                          error("Upload failed");
                        }

                        return {
                          abort: () => {
                            abort();
                          },
                        };
                      },
                      revert: (fileUfsUrl, load) => {
                        console.log(`File Removed: ${fileUfsUrl}`);
                        // Remove the image from the form
                        const images = (form.getValues("images") ?? []).filter(
                          (file) => file !== fileUfsUrl
                        );
                        form.setValue("images", images, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        load();
                      },
                    }}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">
                  Upload up to 3 photos to share your experience
                </p>
              </FormItem>
            )}
          />

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
            <Button
              type="submit"
              disabled={updateReviewMutation.isPending || filePending}
              className="flex-1"
            >
              {updateReviewMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : filePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
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
