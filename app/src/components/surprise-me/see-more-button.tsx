"use client";

import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useMapStore } from "../map/map-store";
import { useShallow } from "zustand/react/shallow";

export function SeeMoreButton({
  poiId,
  latitude,
  longitude,
}: {
  poiId: number;
  latitude: number;
  longitude: number;
}) {
  const router = useRouter();
  const mapStore = useMapStore(
    useShallow(({ setCurrentMapTab, setRecommendFromPos, setViewingPOI }) => ({
      setCurrentMapTab,
      setRecommendFromPos,
      setViewingPOI,
    }))
  );
  return (
    <Button
      variant="default"
      onClick={() => {
        mapStore.setCurrentMapTab("recommend");
        mapStore.setRecommendFromPos({
          latitude: latitude,
          longitude: longitude,
        });
        mapStore.setViewingPOI({
          type: "existing-poi",
          poiId: poiId,
        });
        router.push("/");
      }}
    >
      See More
    </Button>
  );
}
