"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useMapStore } from "../map/map-store";
import { useShallow } from "zustand/react/shallow";

export function ExploreMoreButton() {
  const router = useRouter();
  const mapStore = useMapStore(
    useShallow(({ setCurrentMapTab }) => ({
      setCurrentMapTab,
    }))
  );
  return (
    <Button
      variant="default"
      onClick={() => {
        mapStore.setCurrentMapTab("recommend");
        router.push("/");
      }}
    >
      Explore More
    </Button>
  );
}
