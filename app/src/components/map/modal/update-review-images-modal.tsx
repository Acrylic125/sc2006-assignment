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
import { Loader2, TrashIcon, X } from "lucide-react";
import { useState } from "react";
import { useUploadImage } from "@/app/api/uploadthing/client";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

const UpdateReviewFormSchema = z.object({
  images: z.array(z.string()),
  toDeleteImages: z.array(z.number()),
});

export function UpdateReviewImagesDialog({
  options,
  close,
}: {
  options: ExtractOptions<"update-review-images">;
  close: () => void;
}) {
  const [filePending, setFilePending] = useState(false);

  const updateReviewImagesMutation =
    trpc.review.updateReviewImages.useMutation();
  const utils = trpc.useUtils();
  const { uploadImage } = useUploadImage();

  const form = useForm<z.infer<typeof UpdateReviewFormSchema>>({
    resolver: zodResolver(UpdateReviewFormSchema),
    defaultValues: {
      images: [],
      toDeleteImages: [],
    },
  });

  const onSubmit = (data: z.infer<typeof UpdateReviewFormSchema>) => {
    const reviewData = {
      reviewId: options.reviewId,
      images: data.images,
      toDeleteImages: data.toDeleteImages,
    };

    updateReviewImagesMutation.mutate(reviewData, {
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
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Update Your Review</DialogTitle>
        <DialogDescription>
          Modify your existing review for this place.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <ScrollArea className="h-72">
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="toDeleteImages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>My Photos</FormLabel>
                    <FormControl>
                      {options.images.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {options.images.map((image) => (
                            <Button
                              key={image.id}
                              type="button"
                              variant="ghost"
                              className="px-0 py-0 h-full relative w-full aspect-square"
                              onClick={() => {
                                const currentSet = new Set(field.value);
                                if (currentSet.has(image.id)) {
                                  currentSet.delete(image.id);
                                } else {
                                  currentSet.add(image.id);
                                }
                                field.onChange(Array.from(currentSet));
                              }}
                            >
                              <Image
                                src={image.url}
                                alt="Review Image"
                                fill
                                className="object-cover"
                              />
                              {field.value.includes(image.id) ? (
                                <Badge
                                  variant="destructive"
                                  className="absolute top-2 right-2"
                                >
                                  To Remove
                                </Badge>
                              ) : (
                                <X className="h-4 w-4 absolute top-2 right-2" />
                              )}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="h-24 w-full flex flex-col items-center justify-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            No photos added yet.
                          </p>
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add new photos</FormLabel>
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
                              abort,
                            };
                          },
                          revert: (fileUfsUrl, load) => {
                            console.log(`File Removed: ${fileUfsUrl}`);
                            // Remove the image from the form
                            const images = (
                              form.getValues("images") ?? []
                            ).filter((file) => file !== fileUfsUrl);
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
            </div>
          </ScrollArea>

          <DialogFooter className="flex flex-col sm:flex-col gap-4 w-full sm:justify-start">
            {updateReviewImagesMutation.isError && (
              <Alert variant="destructive" className="w-full">
                <AlertTitle>Unable to update review images.</AlertTitle>
                <AlertDescription>
                  <p>{updateReviewImagesMutation.error.message}</p>
                </AlertDescription>
              </Alert>
            )}
            <div className="w-full flex flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={updateReviewImagesMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateReviewImagesMutation.isPending || filePending}
              >
                {updateReviewImagesMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : filePending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
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
