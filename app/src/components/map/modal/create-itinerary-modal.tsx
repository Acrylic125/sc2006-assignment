"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
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
import { useMapStore } from "../map-store";
import { useShallow } from "zustand/react/shallow";

const CreateItineraryFormSchema = z.object({
  name: z.string().min(1, "Itinerary name is required").max(128, "Name must be 128 characters or less"),
});

export function CreateItineraryDialog({
  close,
}: {
  close: () => void;
}) {
  const mapStore = useMapStore(
    useShallow(({ setViewingItineraryId, setCurrentSidePanelTab }) => ({
      setViewingItineraryId,
      setCurrentSidePanelTab,
    }))
  );
  
  const utils = trpc.useUtils();
  const createItineraryMutation = trpc.itinerary.createItinerary.useMutation();
  
  const form = useForm<z.infer<typeof CreateItineraryFormSchema>>({
    resolver: zodResolver(CreateItineraryFormSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof CreateItineraryFormSchema>) => {
    try {
      const newItinerary = await createItineraryMutation.mutateAsync({
        name: data.name,
      });
      
      // Invalidate and refetch itineraries list
      await utils.itinerary.getAllItineraries.invalidate();
      
      // Set the new itinerary as the viewing itinerary
      mapStore.setViewingItineraryId(newItinerary.id);
      mapStore.setCurrentSidePanelTab("itinerary");
      
      // Close the modal
      close();
    } catch (error) {
      // Error will be handled by the mutation error state
      console.error("Failed to create itinerary:", error);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Itinerary</DialogTitle>
        <DialogDescription>
          Give your itinerary a name to get started planning your trip!
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Itinerary Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., Singapore Weekend Adventure" 
                    {...field} 
                    autoFocus
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {createItineraryMutation.isError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to create itinerary.</AlertTitle>
              <AlertDescription>
                <p>{createItineraryMutation.error.message}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-row gap-2">
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
              className="flex-1"
            >
              {createItineraryMutation.isPending ? "Creating..." : "Create Itinerary"}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}

