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
import { trpc } from "@/server/client";
import { UploadButton, UploadDropzone } from "@/components/uploadthing";

const POICreateFormSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  name: z.string(),
  description: z.string(),
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
      address: options.address, //how to pass the default value into here?
      lat: options.latitude, //pass a separate default to address so we can be more specific
      lng: options.longitude, //^
      name: options.name,
      description: options.description,
    },
  });

  const onSubmit = (data: z.infer<typeof POICreateFormSchema>) => {
    console.log(data);
  };

  return (
    <>
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
              <div className="label-main">Upload images near the location: </div>
              <small className="label-sub">(Image location data must be near the selected area)</small>
            </div>

            <UploadDropzone
              appearance={{
                button:
                  "opacity-50 ut-ready:opacity-100 ut-readying:bg-primary ut-readying:text-primary-foreground ut-ready:bg-primary ut-ready:text-primary-foreground bg-primary text-primary-foreground ut-uploading:cursor-not-allowed",
                container:
                  "w-full flex-col rounded-md dark:border-border border-border border-2 bg-card",
                label: "text-foreground dark:text-foreground",
                allowedContent:
                  "flex h-8 flex-col items-center justify-center px-2 text-foreground dark:text-foreground",
              }}
              endpoint="imageUploader"
              onClientUploadComplete={(res) => {
                // Do something with the response
                // TODO: Call backend trpc method to upload images to the database
                // also check that the files have a location near the pin
                res.forEach((file) => {
                  console.log("File: ", file.ufsUrl);
                });
              }}
              onUploadError={(error: Error) => {
                // Do something with the error.
                alert(`ERROR! ${error.message}`);
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
    </>
  );
}