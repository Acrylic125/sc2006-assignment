"use client";

import { useRef, useEffect, useState } from "react";
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
import { trpc } from "@/server/client";
import { useMapModalStore } from "./modal/map-modal-store";

export function ItineraryDropdown() {
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId, setViewingItineraryId }) => {
      return {
        viewingItineraryId,
        setViewingItineraryId,
      };
    })
  );
  const modalStore = useMapModalStore();
  const itinerariesQuery = trpc.itinerary.getAllItineraries.useQuery();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-36 md:w-40 lg:w-52">
          {mapStore.viewingItineraryId ? (
            <span className="truncate">
              {
                itinerariesQuery.data?.find(
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

        {itinerariesQuery.data?.map((itinerary) => (
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
        <DropdownMenuItem
          className="px-2"
          onClick={() => {
            modalStore.setAction({
              type: "create-itinerary",
              options: {
                longitude: 0,
                latitude: 0,
              },
            });
          }}
        >
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
  const tagsQuery = trpc.map.getTags.useQuery();
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
      <DropdownMenuContent className="max-h-64 overflow-y-auto">
        <DropdownMenuLabel>Tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tagsQuery.data?.map((tag) => (
          <Button
            key={tag.id}
            variant="ghost"
            className="w-full flex flex-row items-center gap-2 justify-start px-2"
            onClick={() => {
              const currentExcludedTags = new Set(mapStore.excludedTags);
              if (mapStore.excludedTags.has(tag.id)) {
                currentExcludedTags.delete(tag.id);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              } else {
                currentExcludedTags.add(tag.id);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              }
            }}
          >
            <span className="w-4">
              {!mapStore.excludedTags.has(tag.id) && (
                <Check className="size-4" />
              )}
            </span>
            <span>{tag.name}</span>
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

function createPinURL(color: string) {
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(`
    <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16.0002" cy="16" r="16" fill="${color}" />
      <path d="M0 16H32C32 27.5 28.3233 36.8858 15.75 48C3.59311 35.165 0.136821 28.1267 0 16Z" fill="${color}"/>
      <circle cx="16.0005" cy="16" r="8" fill="white"/>
    </svg>
  `)
  );
}

const pins = {
  red: createPinURL("#FB2C36"),
  blue: createPinURL("#3B82F6"),
  green: createPinURL("#10B981"),
  yellow: createPinURL("#EAB308"),
  purple: createPinURL("#8B5CF6"),
  orange: createPinURL("#F59E0B"),
  pink: createPinURL("#EC4899"),
};

function useExploreMap(map: mapboxgl.Map | null, enabled: boolean) {
  const mapStore = useMapStore(
    useShallow(
      ({
        filters,
        viewingItineraryId,
        setCurrentSidePanelTab,
        setViewingPOI,
      }) => {
        return {
          filters,
          viewingItineraryId,
          setCurrentSidePanelTab,
          setViewingPOI,
        };
      }
    )
  );
  const poisQuery = trpc.map.search.useQuery(
    {
      showVisited: mapStore.filters.showVisited,
      showUnvisited: mapStore.filters.showUnvisited,
      excludedTags: Array.from(mapStore.filters.excludedTags),
    },
    {
      enabled,
    }
  );
  const itinerariesQuery = trpc.itinerary.getItinerary.useQuery(
    {
      id: mapStore.viewingItineraryId ?? 0,
    },
    {
      enabled: mapStore.viewingItineraryId !== null,
    }
  );

  useEffect(() => {
    if (!enabled) return;
    if (!poisQuery.data) return;
    if (!map) return;

    const itineraryPOISSet = new Set(
      itinerariesQuery.data?.pois.map((poi) => poi.id) ?? []
    );

    let cleanUpFn: (() => void) | undefined;

    const load = async () => {
      const LAYER_EXPLORE_PINS = "explore-pins-layer";
      const SOURCE_EXPLORE_PINS = "explore-pins";

      const features = [];
      for (const poi of poisQuery.data) {
        features.push({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [poi.pos.longitude, poi.pos.latitude],
          },
          properties: {
            id: poi.id,
            color: itineraryPOISSet.has(poi.id) ? "green" : "blue",
          },
        });
      }

      map.addSource(SOURCE_EXPLORE_PINS, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: features,
        },
      });
      const handlePinClick = (e: mapboxgl.MapMouseEvent) => {
        if (e.features === undefined || e.features?.length === 0) return;
        const poiId = e.features?.[0]?.properties?.id;
        if (poiId === undefined || typeof poiId !== "number") return;
        mapStore.setViewingPOI({ type: "existing-poi", poiId });
        mapStore.setCurrentSidePanelTab("place");
      };
      map.on("click", LAYER_EXPLORE_PINS, handlePinClick);

      cleanUpFn = () => {
        if (map.getLayer(LAYER_EXPLORE_PINS)) {
          map.removeLayer(LAYER_EXPLORE_PINS);
        }
        if (map.getSource(SOURCE_EXPLORE_PINS)) {
          map.removeSource(SOURCE_EXPLORE_PINS);
        }
        map.off("click", LAYER_EXPLORE_PINS, handlePinClick);
      };

      // Ensure the pin image is loaded before adding the layer
      const ensurePinImage = async (color: keyof typeof pins) => {
        if (map.hasImage(`pin-${color}`)) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        const url = pins[color];
        img.src = url;
        try {
          await img.decode();
          const bitmap = await createImageBitmap(img);
          if (!map.hasImage(`pin-${color}`)) {
            map.addImage(`pin-${color}`, bitmap);
          }
        } catch (err) {
          console.error("Failed to load pin image", err);
        }
      };

      await ensurePinImage("red");
      await ensurePinImage("green");
      await ensurePinImage("blue");

      if (!map.getLayer(LAYER_EXPLORE_PINS)) {
        map.addLayer({
          id: LAYER_EXPLORE_PINS,
          type: "symbol",
          source: SOURCE_EXPLORE_PINS,
          layout: {
            "icon-image": ["concat", "pin-", ["get", "color"]],
            "icon-size": 0.5,
            "icon-anchor": "bottom",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
        });
      }
    };
    map.on("load", load);
    map.fire("load");
    return () => {
      cleanUpFn?.();
      map.off("load", load);
    };
  }, [
    map,
    poisQuery.data,
    itinerariesQuery.data,
    enabled,
    mapStore,
    mapStore.setCurrentSidePanelTab,
    mapStore.setViewingPOI,
  ]);
}

function useRecommendMap(map: mapboxgl.Map | null, enabled: boolean) {
  const mapStore = useMapStore(
    useShallow(
      ({
        filters,
        viewingItineraryId,
        setCurrentSidePanelTab,
        recommend,
        setRecommendFromPos,
        setViewingPOI,
      }) => {
        return {
          filters,
          viewingItineraryId,
          setCurrentSidePanelTab,
          recommendFromPos: recommend.recommendFromPos,
          setRecommendFromPos,
          setViewingPOI,
        };
      }
    )
  );

  const poisQuery = trpc.map.search.useQuery(
    {
      recommendFromLocation: mapStore.recommendFromPos,
      showVisited: mapStore.filters.showVisited,
      showUnvisited: mapStore.filters.showUnvisited,
      excludedTags: Array.from(mapStore.filters.excludedTags),
    },
    {
      enabled,
    }
  );
  const itinerariesQuery = trpc.itinerary.getItinerary.useQuery(
    {
      id: mapStore.viewingItineraryId ?? 0,
    },
    {
      enabled: mapStore.viewingItineraryId !== null,
    }
  );

  useEffect(() => {
    if (!enabled) return;
    if (!map) return;

    let cleanUpFn: (() => void) | undefined;
    // let loadingMarker: mapboxgl.Marker | null = null;
    const itineraryPOISSet = new Set(
      itinerariesQuery.data?.pois.map((poi) => poi.id) ?? []
    );

    const load = async () => {
      const LAYER_RECOMMEND_PINS = "recommend-pins-layer";
      const SOURCE_RECOMMEND_PINS = "recommend-pins";
      const LAYER_PIN_FROM_PINS = "pin-from-layer";
      const SOURCE_PIN_FROM_PINS = "pin-from-pins";

      // Add map click handler to set recommend position
      const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        if (map.getLayer(LAYER_RECOMMEND_PINS)) {
          const features = map.queryRenderedFeatures(e.point, {
            layers: [LAYER_RECOMMEND_PINS],
          });
          if (!(features === undefined || features?.length === 0)) {
            const poiId = features?.[0]?.properties?.id;
            if (poiId === undefined || typeof poiId !== "number") return;
            mapStore.setViewingPOI({ type: "existing-poi", poiId });
            mapStore.setCurrentSidePanelTab("place");
            return;
          }
        }
        const { lng, lat } = e.lngLat;
        mapStore.setRecommendFromPos({ latitude: lat, longitude: lng });
      };

      // Remove existing click handlers to avoid duplicates
      cleanUpFn = () => {
        // Remove existing layers and sources
        if (map.getLayer(LAYER_RECOMMEND_PINS)) {
          map.removeLayer(LAYER_RECOMMEND_PINS);
        }
        if (map.getSource(SOURCE_RECOMMEND_PINS)) {
          map.removeSource(SOURCE_RECOMMEND_PINS);
        }
        if (map.getLayer(LAYER_PIN_FROM_PINS)) {
          map.removeLayer(LAYER_PIN_FROM_PINS);
        }
        if (map.getSource(SOURCE_PIN_FROM_PINS)) {
          map.removeSource(SOURCE_PIN_FROM_PINS);
        }
        map.off("click", handleMapClick);
      };
      map.on("click", handleMapClick);

      // Add POI pins if data is available
      if (poisQuery.data) {
        const features = [];
        for (const poi of poisQuery.data) {
          features.push({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [poi.pos.longitude, poi.pos.latitude],
            },
            properties: {
              id: poi.id,
              color: itineraryPOISSet.has(poi.id) ? "green" : "blue",
            },
          });
        }
        map.addSource(SOURCE_RECOMMEND_PINS, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: features,
          },
        });
      }

      // Add red pin for recommend position
      map.addSource(SOURCE_PIN_FROM_PINS, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  mapStore.recommendFromPos.longitude,
                  mapStore.recommendFromPos.latitude,
                ],
              },
              properties: {
                color: "red",
              },
            },
          ],
        },
      });

      // Ensure the pin images are loaded before adding the layers
      const ensurePinImage = async (color: keyof typeof pins) => {
        if (map.hasImage(`pin-${color}`)) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        const url = pins[color];
        img.src = url;
        try {
          await img.decode();
          const bitmap = await createImageBitmap(img);
          if (!map.hasImage(`pin-${color}`)) {
            map.addImage(`pin-${color}`, bitmap);
          }
        } catch (err) {
          console.error("Failed to load pin image", err);
        }
      };

      await ensurePinImage("red");
      await ensurePinImage("green");
      await ensurePinImage("blue");

      // Add POI layer if data is available
      if (poisQuery.data && !map.getLayer(LAYER_RECOMMEND_PINS)) {
        map.addLayer({
          id: LAYER_RECOMMEND_PINS,
          type: "symbol",
          source: SOURCE_RECOMMEND_PINS,
          layout: {
            "icon-image": ["concat", "pin-", ["get", "color"]],
            "icon-size": 1,
            "icon-anchor": "bottom",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
          },
        });
      }

      // Add recommend pin layer
      if (!map.getLayer(LAYER_PIN_FROM_PINS)) {
        map.addLayer({
          id: LAYER_PIN_FROM_PINS,
          type: "symbol",
          source: SOURCE_PIN_FROM_PINS,
          layout: {
            "icon-image": "pin-red",
            "icon-size": 1,
            "icon-anchor": "bottom",
          },
        });
      }
    };
    map.on("load", load);
    map.fire("load");
    return () => {
      cleanUpFn?.();
      map.off("load", load);
    };
  }, [
    map,
    // poisQuery.isLoading,
    poisQuery.data,
    itinerariesQuery.data,
    enabled,
    mapStore,
    mapStore.setCurrentSidePanelTab,
    mapStore.recommendFromPos,
    mapStore.setViewingPOI,
  ]);
}

export function ExploreMap({ className }: { className: string }) {
  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapStore = useMapStore(
    useShallow(({ currentMapTab }) => {
      return {
        currentMapTab,
      };
    })
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_PK;
    const m = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [103.8198, 1.3521],
      zoom: 10,
      // fadeDuration: 0,
    });
    setMap(m);
    return () => {
      m.remove();
    };
  }, []);

  useExploreMap(map, mapStore.currentMapTab === "explore");
  useRecommendMap(map, mapStore.currentMapTab === "recommend");

  return <div id="map-container" ref={mapContainerRef} className={className} />;
}
