"use client";

import { useEffect } from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useMapStore } from "./map-store";
import { useShallow } from "zustand/react/shallow";
import { trpc } from "@/server/client";

const mapViewTabs = [
  {
    id: "explore",
    label: "Explore",
  },
  {
    id: "recommend",
    label: "Recommend",
  },
] as const;

export function MapViewTabGroup() {
  const mapStore = useMapStore(
    useShallow(({ currentMapTab, setCurrentMapTab }) => {
      return {
        currentMapTab,
        setCurrentMapTab,
      };
    })
  );

  return (
    <div className="flex flex-row bg-secondary/75 backdrop-blur-sm rounded-full border border-border p-1">
      {mapViewTabs.map((tab) => {
        return (
          <Button
            key={tab.id}
            variant={mapStore.currentMapTab === tab.id ? "default" : "ghost"}
            onClick={() => {
              mapStore.setCurrentMapTab(tab.id);
            }}
            size="sm"
            className={cn("rounded-full shadow-sm text-sm py-1 px-2.5 h-fit", {
              "border-border border": mapStore.currentMapTab === tab.id,
            })}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
