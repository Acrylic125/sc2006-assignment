"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMapModalStore } from "./map-modal-store";

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

  const isOpen = modalStore.action !== null;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-lg md:max-w-xl lg:max-w-2xl"></DialogContent>
    </Dialog>
  );
}
