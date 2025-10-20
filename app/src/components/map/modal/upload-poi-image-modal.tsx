import { useForm } from "react-hook-form";
import { ExtractOptions } from "./map-modal-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/server/client";

import { useMapStore } from "@/components/map/map-store";

import { useUploadImage } from "@/app/api/uploadthing/client";

import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImagePreview from "filepond-plugin-image-preview";
import "filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import { useState } from "react";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

const UploadPOIImageSchema = z.object({
  poiId: z.number(),
  name: z.string(),
  images: z.array(z.string()),
});

export function UploadImageDialog({
  options,
  close,
}: {
  options: ExtractOptions<"upload-poi-image">;
  close: () => void;
}) {
  const createPOIMutation = trpc.map.uploadPOIImage.useMutation();
  const form = useForm<z.infer<typeof UploadPOIImageSchema>>({
    resolver: zodResolver(UploadPOIImageSchema),
    defaultValues: {
      poiId: options.poiId,
      name: options.name,
      images: [],
    },
  });

  const onSubmit = async (data: z.infer<typeof UploadPOIImageSchema>) => {
    //console.log(data);
    createPOIMutation.mutate(data, {
      onError: (err) => {
        console.error("Error creating POI", err);
      },
      onSuccess: () => {
        close(); //close the form
      },
    });
  };

  const { uploadImage } = useUploadImage();
  const handleUpload = async (file: File) => {
    try {
      const result = await uploadImage(file);
      return result.ufsUrl;
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  const [filePending, setFilePending] = useState(false); //bool of whether a file is pending
  return (
    <ScrollArea className="max-h-[85vh] w-[30vw]">
      <DialogHeader>
        <DialogTitle className="mb-0">
          <span className="text-base font-normal">Upload Images for:</span>{" "}
          {options.name}
        </DialogTitle>
        <DialogDescription className="mb-5 -mt-1">
          Took some nice pictures? Add it to our map to share with others!
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FilePond
            allowMultiple={true}
            maxFiles={3}
            name="images"
            acceptedFileTypes={["image/*"]}
            labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
            onaddfilestart={() => setFilePending(true)} //track when a file is being uploaded
            onprocessfiles={() => setFilePending(false)} //track when all files are done
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
                  //convert filepond actualFile to File
                  const realFile = new File([file], file.name, {
                    type: file.type,
                    lastModified: file.lastModified ?? Date.now(),
                  });
                  // const result = await uploadImage(realFile);
                  const result = await handleUpload(realFile);
                  if (!result) {
                    return;
                  }
                  //add image to store
                  const images = [...(form.getValues("images") ?? []), result];
                  form.setValue("images", images, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  load(result); // tell FilePond it's done
                } catch (err) {
                  console.error("Filepond upload failed", err);
                }

                return {
                  abort: () => {
                    abort();
                  },
                };
              },
              revert: (fileUfsUrl, load) => {
                console.log(`File Removed: ${fileUfsUrl}`);
                //remove the image from the store
                const images = form
                  .getValues("images")
                  .filter((file) => file !== fileUfsUrl);
                form.setValue("images", images, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                load();
              },
            }}
          />

          {createPOIMutation.isError && (
            <Alert variant="error">
              <AlertTitle>Unable to upload POI iamge.</AlertTitle>
              <AlertDescription>
                <p>{createPOIMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-row gap-2 w-full sm:justify-start">
            <Button
              variant="outline"
              onClick={close}
              disabled={createPOIMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPOIMutation.isPending || filePending}
            >
              {createPOIMutation.isPending ? "Uploading..." : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </ScrollArea>
  );
}
