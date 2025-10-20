import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/server/client";
import { Loader2, Pen } from "lucide-react";
import { useEffect } from "react";

const RenameItineraryFormSchema = z.object({
  name: z
    .string()
    .min(1, "Itinerary name is required")
    .max(128, "Name must be less than 128 characters"),
});

export function RenameItineraryModal({
  itineraryId,
  currentName,
  close,
}: {
  itineraryId: number;
  currentName: string;
  close: () => void;
}) {
  const utils = trpc.useUtils();
  const renameItineraryMutation = trpc.itinerary.renameItinerary.useMutation({
    onSuccess: () => {
      utils.itinerary.getAllItineraries.invalidate();
      close();
    },
    onError: (error) => {
      console.error("Failed to rename itinerary:", error);
    },
  });

  const form = useForm<z.infer<typeof RenameItineraryFormSchema>>({
    resolver: zodResolver(RenameItineraryFormSchema),
    defaultValues: {
      name: currentName,
    },
  });

  // Focus and select the input text when modal opens
  useEffect(() => {
    const input = document.querySelector(
      'input[name="name"]'
    ) as HTMLInputElement;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const onSubmit = (data: z.infer<typeof RenameItineraryFormSchema>) => {
    const trimmedName = data.name.trim();

    // Don't submit if name hasn't changed
    if (trimmedName === currentName.trim()) {
      close();
      return;
    }

    renameItineraryMutation.mutate({
      id: itineraryId,
      name: trimmedName,
    });
  };

  return (
    <>
      <DialogHeader className="w-md">
        <DialogTitle className="flex items-center gap-2">
          Rename Itinerary
        </DialogTitle>
        <DialogDescription>
          Enter a new name for your itinerary.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Itinerary Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter itinerary name"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        close();
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {renameItineraryMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to rename itinerary.</AlertTitle>
              <AlertDescription>
                <p>{renameItineraryMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-row gap-2 w-full sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={renameItineraryMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={renameItineraryMutation.isPending}>
              {renameItineraryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
