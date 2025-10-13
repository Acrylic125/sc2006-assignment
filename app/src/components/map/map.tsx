"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import { env } from "@/lib/env";

import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "./map-store";
import { useShallow } from "zustand/react/shallow";
import { trpc } from "@/server/client";

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
  // yellow: createPinURL("#EAB308"),
  // purple: createPinURL("#8B5CF6"),
  // orange: createPinURL("#F59E0B"),
  // pink: createPinURL("#EC4899"),
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
  const [addPoiPos, setAddPoiPos] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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
      const LAYER_ADD_POI_PINS = "add-poi-pins-layer";
      const SOURCE_ADD_POI_PINS = "add-poi-pins";

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

      const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
        if (map.getLayer(LAYER_EXPLORE_PINS)) {
          const features = map.queryRenderedFeatures(e.point, {
            layers: [LAYER_EXPLORE_PINS],
          });
          if (!(features === undefined || features?.length === 0)) {
            const poiId = features?.[0]?.properties?.id;
            if (poiId === undefined || typeof poiId !== "number") return;
            mapStore.setViewingPOI({ type: "existing-poi", poiId });
            mapStore.setCurrentSidePanelTab("place");
            if (features?.[0]?.geometry?.type === 'Point') {
              const coords = features?.[0]?.geometry?.coordinates; //coords are lng lat
              setAddPoiPos({ latitude: coords[1], longitude: coords[0] });
            }
            return; //can we use this to expose a method in create-poi-modal to reload the map?
          }
        }
        const { lng, lat } = e.lngLat;
        setAddPoiPos({ latitude: lat, longitude: lng });
        const pos = { latitude: lat, longitude: lng };
        mapStore.setViewingPOI({ type: "new-poi", pos });
        mapStore.setCurrentSidePanelTab("place");
      };

      cleanUpFn = () => {
        if (map.getLayer(LAYER_EXPLORE_PINS)) {
          map.removeLayer(LAYER_EXPLORE_PINS);
        }
        if (map.getSource(SOURCE_EXPLORE_PINS)) {
          map.removeSource(SOURCE_EXPLORE_PINS);
        }
        if (map.getLayer(LAYER_ADD_POI_PINS)) {
          map.removeLayer(LAYER_ADD_POI_PINS);
        }
        if (map.getSource(SOURCE_ADD_POI_PINS)) {
          map.removeSource(SOURCE_ADD_POI_PINS);
        }
        map.off("click", handleMapClick);
      };

      // Force remove existing layers and sources
      cleanUpFn();

      map.on("click", handleMapClick);
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

      map.addSource(SOURCE_EXPLORE_PINS, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: features,
        },
      });
      if (addPoiPos) {
        map.addSource(SOURCE_ADD_POI_PINS, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [addPoiPos.longitude, addPoiPos.latitude],
                },
                properties: { color: "red" },
              },
            ],
          },
        });
      }

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
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
          },
        });
      }
      if (addPoiPos && !map.getLayer(LAYER_ADD_POI_PINS)) {
        map.addLayer({
          id: LAYER_ADD_POI_PINS,
          type: "symbol",
          source: SOURCE_ADD_POI_PINS,
          layout: {
            "icon-image": ["concat", "pin-", ["get", "color"]],
            "icon-size": 1,
            "icon-anchor": "bottom",
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
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
    addPoiPos,
    setAddPoiPos,
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

  const poisQuery = trpc.map.recommend.useQuery(
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

      // Force remove existing layers and sources
      cleanUpFn();
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
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
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
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
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

export default function ExploreMap({ className }: { className: string }) {
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
