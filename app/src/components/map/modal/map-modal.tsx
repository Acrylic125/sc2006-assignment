"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMapModalStore } from "./map-modal-store";
import { POIReviewDialog } from "./itinerary-poi-review-modal";
import { CreateItineraryDialog } from "./create-itinerary-modal";
import { CreatePOIDialog } from "./create-poi-modal";

export function MapModal() {
  const modalStore = useMapModalStore(
    useShallow((state) => {
      return {
        action: state.action,
        setAction: state.setAction,
      };
    })
  );
  const setOpen = useCallback(
    (open: boolean) => {
      modalStore.setAction(null);
    },
    [modalStore]
  );
  const close = useCallback(() => {
    console.log("closing");
    modalStore.setAction(null);
  }, [modalStore]);

  console.log(modalStore.action);
  const isOpen = modalStore.action !== null;
  console.log(isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        {modalStore.action?.type === "itinerary-poi-review" && (
          <POIReviewDialog options={modalStore.action.options} close={close} />
        )}
        {modalStore.action?.type === "create-itinerary" && (
          <CreateItineraryDialog close={close} />
        )}
        {modalStore.action?.type === "create-poi" && (
          <CreatePOIDialog options={modalStore.action.options} close={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}
