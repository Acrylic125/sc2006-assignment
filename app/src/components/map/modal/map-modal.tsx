"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMapModalStore } from "./map-modal-store";
import { POIReviewDialog } from "./itinerary-poi-review-modal";
import { CreateItineraryDialog } from "./create-itinerary-modal";
import { DeleteItineraryModal } from "./delete-itinerary-modal";
import { RenameItineraryModal } from "./rename-itinerary-modal";
import { RemovePOIFromItineraryModal } from "./remove-poi-from-itinerary-modal";
import { DeleteReviewModal } from "./delete-review-modal";
import { trpc } from "@/server/client";

export function MapModal() {
  const modalStore = useMapModalStore(
    useShallow((state) => {
      return {
        action: state.action,
        setAction: state.setAction,
      };
    })
  );

  const utils = trpc.useUtils();

  const setOpen = useCallback(
    (open: boolean) => {
      modalStore.setAction(null);
    },
    [modalStore]
  );

  const close = useCallback(() => {
    modalStore.setAction(null);
  }, [modalStore]);

  const isOpen = modalStore.action !== null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent>
        <VisuallyHidden>
          <DialogTitle>Modal</DialogTitle>
        </VisuallyHidden>
        {modalStore.action?.type === "itinerary-poi-review" && (
          <POIReviewDialog options={modalStore.action.options} close={close} />
        )}
        {modalStore.action?.type === "create-itinerary" && (
          <CreateItineraryDialog
            close={close}
            poiId={modalStore.action.options.poiId}
          />
        )}
        {modalStore.action?.type === "delete-itinerary" && (
          <DeleteItineraryModal
            itineraryId={modalStore.action.options.itineraryId}
            itineraryName={modalStore.action.options.itineraryName}
            close={close}
          />
        )}
        {modalStore.action?.type === "rename-itinerary" && (
          <RenameItineraryModal
            itineraryId={modalStore.action.options.itineraryId}
            currentName={modalStore.action.options.currentName}
            close={close}
          />
        )}
        {modalStore.action?.type === "remove-poi-from-itinerary" && (
          <RemovePOIFromItineraryModal
            itineraryId={modalStore.action.options.itineraryId}
            poiId={modalStore.action.options.poiId}
            poiName={modalStore.action.options.poiName}
            close={close}
          />
        )}
        {modalStore.action?.type === "delete-review" && (
          <DeleteReviewModal
            reviewId={modalStore.action.options.reviewId}
            poiId={modalStore.action.options.poiId}
            close={close}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
