import { useForm } from "react-hook-form";
import { ExtractOptions } from "./map-modal-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginImagePreview,
  FilePondPluginFileValidateType
);

const POICreateFormSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.number()),
  images: z.array(z.string()),
});

export function CreatePOIDialog({
  options,
  close,
}: {
  options: ExtractOptions<"create-poi">;
  close: () => void;
}) {
  const createPOIMutation = trpc.map.createPOI.useMutation();
  const form = useForm<z.infer<typeof POICreateFormSchema>>({
    resolver: zodResolver(POICreateFormSchema),
    defaultValues: {
      address: options.address,
      lat: options.latitude,
      lng: options.longitude,
      name: options.name,
      description: options.description,
      tags: [],
      images: [],
    },
  });

  const tagsQuery = trpc.map.getTags.useQuery();

  const { setViewingPOI, setCurrentSidePanelTab } = useMapStore();
  const onSubmit = async (data: z.infer<typeof POICreateFormSchema>) => {
    //console.log(data);
    createPOIMutation.mutate(data, {
      onError: (err) => {
        console.error("Error creating POI", err);
      },
      onSuccess: (data, vars) => {
        setViewingPOI({
          type: "existing-poi",
          poiId: data.id,
        });
        setCurrentSidePanelTab("place");
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
  const [selectedTags, setSelectedTags] = useState<number[]>([]); //array of selected tag ids
  return (
    <ScrollArea className="max-h-[85vh] max-w-xl w-full">
      <DialogHeader>
        <DialogTitle className="mb-0">Add a new POI</DialogTitle>
        <DialogDescription className="mb-5 -mt-1">
          Know a nice place? Add it to our map!
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <div>
                    <Input placeholder="Address of your POI" {...field} />
                    <p className="text-sm text-muted-foreground mt-1">
                      Pin at: {options.address}, Lat:{" "}
                      {form.getValues("lat").toFixed(2) || "—"}, Lng:{" "}
                      {form.getValues("lng").toFixed(2) || "—"}
                    </p>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Name</FormLabel>
                <FormControl>
                  <Input placeholder="Name of your POI" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Describe this place" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="form-label-group mb-1">
            <div className="label-main">Tags </div>
            <small className="label-sub">(Select at least 1)</small>
          </div>
          <div className="flex flex-wrap gap-1">
            {tagsQuery.data?.map((tag) => (
              <Badge
                key={tag.id}
                className={cn(
                  {
                    "dark:bg-green-300": selectedTags.includes(tag.id),
                    "dark:text-neutral-100": !selectedTags.includes(tag.id),
                    "bg-green-400": selectedTags.includes(tag.id),
                    "text-black": true,
                  },
                  "cursor-pointer"
                )}
                variant={
                  !selectedTags.includes(tag.id) ? "secondary" : "default"
                }
                //variant="secondary"
                //className={`${selectedTags.includes(tag.id) ? "bg-green-300" : ""} cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedTags.includes(tag.id)) {
                    const newTags = selectedTags.filter((id) => id !== tag.id);
                    form.setValue("tags", selectedTags, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setSelectedTags(newTags);
                  } else {
                    const newTags = [...selectedTags, tag.id];
                    form.setValue("tags", newTags, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setSelectedTags(newTags);
                  }
                }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>

          <div className="form-label-group">
            <div className="label-main">Upload pictures of the location: </div>
            <small className="label-sub">
              (These will be displayed when people view the POI)
            </small>
          </div>

          <FilePond
            allowMultiple={true}
            maxFiles={3}
            name="images"
            acceptedFileTypes={["image/*"]}
            labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
            onaddfilestart={() => setFilePending(true)} //track when a file is being uploaded
            onprocessfiles={() => setFilePending(false)} //track when all files are done
            //upload the file via uploadthing client upload
            //we could alternatively set allowFileEncode={true} to encode it into a base 64 string
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
              <AlertTitle>Unable to create POI.</AlertTitle>
              <AlertDescription>
                <p>{createPOIMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              onClick={close}
              disabled={createPOIMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createPOIMutation.isPending ||
                filePending ||
                selectedTags.length === 0 ||
                form.getValues("address").length === 0 ||
                form.getValues("name").length === 0 ||
                form.getValues("description").length === 0
              }
            >
              {createPOIMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Form>
    </ScrollArea>
  );
}
