"use client";

import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { env } from "@/lib/env";

import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useMapStore } from "./map-store";
import { useShallow } from "zustand/react/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Ellipsis, Filter, Pen, Plus, Tag, Trash2 } from "lucide-react";

export function ItineraryDropdown() {
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId, setViewingItineraryId }) => {
      return {
        viewingItineraryId,
        setViewingItineraryId,
      };
    })
  );
  const itineraries = [
    {
      id: 1,
      name: "Itinerary 1",
    },
    {
      id: 2,
      name: "Itinerary 2",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-36 md:w-40 lg:w-52">
          {mapStore.viewingItineraryId ? (
            <span className="truncate">
              {
                itineraries.find(
                  (itinerary) => itinerary.id === mapStore.viewingItineraryId
                )?.name
              }
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              No Intinerary Selected
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Itineraries</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {itineraries.map((itinerary) => (
          <div key={itinerary.id} className="relative">
            <Button
              onClick={() => {
                if (mapStore.viewingItineraryId === itinerary.id) {
                  mapStore.setViewingItineraryId(null);
                } else {
                  mapStore.setViewingItineraryId(itinerary.id);
                }
              }}
              className="w-full px-2 flex flex-row items-center justify-start pr-20"
              variant={
                mapStore.viewingItineraryId === itinerary.id
                  ? "default"
                  : "ghost"
              }
            >
              {itinerary.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("absolute top-0 right-0", {
                    "text-background":
                      mapStore.viewingItineraryId === itinerary.id,
                    "text-foreground":
                      mapStore.viewingItineraryId !== itinerary.id,
                  })}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Pen className="size-3" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash2 className="size-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="px-2">
          <Plus /> Create Itinerary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FilterDropdown() {
  const mapStore = useMapStore(
    useShallow(({ filters, setFilterShowVisited, setFilterShowUnvisited }) => {
      return {
        showVisited: filters.showVisited,
        showUnvisited: filters.showUnvisited,
        setFilterShowVisited,
        setFilterShowUnvisited,
      };
    })
  );

  const hasModified = !mapStore.showVisited || !mapStore.showUnvisited;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={hasModified ? "default" : "outline"}>
          <Filter /> <span className="hidden lg:block">Filters</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          className="flex flex-row items-center gap-2 w-full justify-start px-2"
          onClick={() => {
            mapStore.setFilterShowVisited(!mapStore.showVisited);
          }}
        >
          <span className="w-4">
            {mapStore.showVisited && <Check className="size-4" />}
          </span>
          <span>Show Visited</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-row items-center gap-2 justify-start px-2"
          onClick={() => {
            mapStore.setFilterShowUnvisited(!mapStore.showUnvisited);
          }}
        >
          <span className="w-4">
            {mapStore.showUnvisited && <Check className="size-4" />}
          </span>
          <span>Show Unvisited</span>
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FilterTagsDropdown() {
  const tags = [
    "Nature",
    "History",
    "Culture",
    "Food",
    "Drinks",
    "Shopping",
    "Entertainment",
  ];
  const mapStore = useMapStore(
    useShallow(({ filters, setFilterExcludedTags }) => {
      return {
        excludedTags: filters.excludedTags,
        setFilterExcludedTags,
      };
    })
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={mapStore.excludedTags.size > 0 ? "default" : "outline"}
        >
          <Tag /> <span className="hidden lg:block">Tags</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tags.map((tag) => (
          <Button
            key={tag}
            variant="ghost"
            className="flex flex-row items-center gap-2 justify-start px-2"
            onClick={() => {
              const currentExcludedTags = new Set(mapStore.excludedTags);
              if (mapStore.excludedTags.has(tag)) {
                currentExcludedTags.delete(tag);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              } else {
                currentExcludedTags.add(tag);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              }
            }}
          >
            <span className="w-4">
              {!mapStore.excludedTags.has(tag) && <Check className="size-4" />}
            </span>
            <span>{tag}</span>
          </Button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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

export function ExploreMap({ className }: { className: string }) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_PK;
    // Marina Bay Sands coordinates [lng, lat]
    // const marinaBaySands: [number, number] = [103.8607, 1.2834];
    const marinaBaySands: [number, number] = [103.8607, 1.2834];

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: marinaBaySands,
      zoom: 15,
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  return <div id="map-container" ref={mapContainerRef} className={className} />;
}
