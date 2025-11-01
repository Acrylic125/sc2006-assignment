"use client";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { trpc } from "@/server/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createItinerarySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

interface CreateItineraryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (itineraryId: number) => void;
}

export function CreateItineraryModal({
  open,
  onClose,
  onSuccess,
}: CreateItineraryModalProps) {
  const createItineraryMutation = trpc.itinerary.createItinerary.useMutation();

  const form = useForm<z.infer<typeof createItinerarySchema>>({
    resolver: zodResolver(createItinerarySchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof createItinerarySchema>) => {
    try {
      const result = await createItineraryMutation.mutateAsync({
        name: values.name,
      });
      onSuccess(result.id);
      onClose();
    } catch (error) {
      console.error("Failed to create itinerary:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Itinerary</DialogTitle>
          <DialogDescription>
          Give your itinerary a name to get started planning your trip!
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="My Itinerary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col sm:flex-col gap-4 w-full sm:justify-start">
            {createItineraryMutation.isError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to create itinerary.</AlertTitle>
                <AlertDescription>
                  <p>{createItineraryMutation.error.message}</p>
                </AlertDescription>
              </Alert>
            )}
            <div className="w-full flex flex-row gap-2">
              <Button
                variant="outline"
                onClick={close}
                disabled={createItineraryMutation.isPending}
                type="button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createItineraryMutation.isPending}
              >
                {createItineraryMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

//<div className="flex justify-end">
              //<Button 
                //type="submit" 
                //disabled={createItineraryMutation.isPending}
              //>
                //{createItineraryMutation.isPending ? "Creating..." : "Create"}
              //</Button>
            //</div>