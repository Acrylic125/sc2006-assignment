"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMapModalStore } from "./map-modal-store";
import { POIReviewDialog } from "./itinerary-poi-review-modal";
import { CreateItineraryDialog } from "./create-itinerary-modal";
import { CreatePOIDialog } from "./create-poi-modal";
import { POIImageCarouselDialog } from "./poi-image-carousel-modal";
import { UploadImageDialog } from "./upload-poi-image-modal";

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
      <DialogTitle className="sr-only">
        Pop-up menu for {modalStore.action?.type}
      </DialogTitle>
      <DialogContent className="w-auto sm:max-w-[80vw]">
        {modalStore.action?.type === "itinerary-poi-review" && (
          <POIReviewDialog options={modalStore.action.options} close={close} />
        )}
        {modalStore.action?.type === "create-itinerary" && (
          <CreateItineraryDialog close={close} />
        )}
        {modalStore.action?.type === "create-poi" && (
          <CreatePOIDialog options={modalStore.action.options} close={close} />
        )}
        {modalStore.action?.type === "poi-image-carousel" && (
          <POIImageCarouselDialog options={modalStore.action.options} close={close} />
        )}
        {modalStore.action?.type === "upload-poi-image" && (
          <UploadImageDialog options={modalStore.action.options} close={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}
