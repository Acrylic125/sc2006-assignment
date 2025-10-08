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