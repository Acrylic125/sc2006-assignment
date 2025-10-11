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

import { useUploadImage } from "@/app/api/uploadthing/client";

import {FilePond, registerPlugin} from 'react-filepond';
import 'filepond/dist/filepond.min.css'
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation'
import FilePondPluginImagePreview from 'filepond-plugin-image-preview'
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css'
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

registerPlugin(FilePondPluginImageExifOrientation, FilePondPluginImagePreview, FilePondPluginFileValidateType)

const POICreateFormSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  name: z.string(),
  description: z.string(),
  images: z.array(z.string())
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
      images: [],
    },
  });

  const onSubmit = (data: z.infer<typeof POICreateFormSchema>) => {
    //console.log(data);
    createPOIMutation.mutate(data, {
      onError: (err) => {
        console.error("Error creating POI", err);
      },
    });
  };

  
  const { uploadImage } = useUploadImage();
  const handleUpload = async (file: File) => {
    try {
      const result = await uploadImage(file);
      console.log("Uploaded:", result.ufsUrl);
    } catch (err) {
      console.error("Upload failed", err);
    }
  };

  return (
    <ScrollArea className="max-h-[85vh] w-auto">
        <DialogHeader>
            <DialogTitle>Add a new POI</DialogTitle>
            <DialogDescription>
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
                    <Input placeholder="Address of your POI" {...field} />
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

            <div className="form-label-group">
              <div className="label-main">Upload pictures of the location: </div>
              <small className="label-sub">(These will be displayed when people view the POI)</small>
            </div>
            
            <FilePond
              allowMultiple={true}
              maxFiles={3}
              name="images"
              acceptedFileTypes={['image/*']}
              labelIdle='Drag & Drop your files or <span class="filepond--label-action">Browse</span>'
              //upload the file via uploadthing client upload
              //we could alternatively set allowFileEncode={true} to encode it into a base 64 string
              server={{
                process: async (fieldName, file, metadata, load, error, progress, abort) => {
                  try {
                    //convert filepond actualFile to File
                    const realFile = new File([file], file.name, {
                      type: file.type,
                      lastModified: file.lastModified ?? Date.now(),
                    });
                    const result = await uploadImage(realFile);
                    //add image to store
                    const images = [...(form.getValues("images") ?? []), result.ufsUrl];
                    form.setValue("images", images, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    load(result.ufsUrl); // tell FilePond it's done
                  } catch (err: any) {
                    error(err.message);
                  }

                  return {
                    abort: () => {
                      abort();
                    },
                  };
                },
                revert: (fileUfsUrl, load) => {
                  console.log(`File Removed: ${fileUfsUrl}`)
                  //remove the image from the store
                  const images = (form.getValues("images")).filter(file => file !== fileUfsUrl);
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
                <Button type="submit" disabled={createPOIMutation.isPending}>
                {createPOIMutation.isPending ? "Creating..." : "New POI"}
                </Button>
            </div>
            </form>
        </Form>
    </ScrollArea>
  );
}