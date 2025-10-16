"use client";

import { useCallback, useMemo, useState } from "react";
import { MapEvent, MapMouseEvent } from "mapbox-gl";
import { env } from "@/lib/env";

import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "./map-store";
import { useShallow } from "zustand/react/shallow";
import { trpc } from "@/server/client";
import Map, { Layer, Source, ViewStateChangeEvent } from "react-map-gl/mapbox";

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
  orange: createPinURL("#F59E0B"),
  // pink: createPinURL("#EC4899"),
};

function ExploreMapLayers({ enabled }: { enabled: boolean }) {
  const mapStore = useMapStore(
    useShallow(
      ({
        filters,
        viewingItineraryId,
        viewingPOI,
        setCurrentSidePanelTab,
        setViewingPOI,
        explore,
      }) => {
        return {
          filters,
          viewingItineraryId,
          viewingPOI,
          setCurrentSidePanelTab,
          setViewingPOI,
          explorePos: explore.explorePos,
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
  const poiPins = useMemo(() => {
    const itineraryPOISSet = new Set(
      itinerariesQuery.data?.pois.map((poi) => poi.id) ?? []
    );
    return poisQuery.data?.map((poi) => {
      // Determine pin color: red for selected POI, green for itinerary POIs, blue for others
      let color = "blue"; // default
      if (
        mapStore.viewingPOI?.type === "existing-poi" &&
        mapStore.viewingPOI.poiId === poi.id
      ) {
        color = "red"; // currently selected POI
      } else if (itineraryPOISSet.has(poi.id)) {
        color = "green"; // POI in current itinerary
      }

      return {
        id: poi.id,
        color: color,
        coordinates: [poi.pos.longitude, poi.pos.latitude],
      };
    });
  }, [poisQuery.data, itinerariesQuery.data, mapStore.viewingPOI]);

  return (
    <>
      <Source
        id="pins"
        type="geojson"
        data={{
          type: "FeatureCollection",
          features:
            poiPins?.map((poi) => {
              const poiPos = poi.coordinates;
              return {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: poiPos,
                },
                properties: {
                  id: poi.id,
                  color: poi.color,
                },
              };
            }) ?? [],
        }}
      >
        <Layer
          id="poi-pins"
          type="symbol"
          source="pins"
          layout={{
            "icon-image": ["concat", "pin-", ["get", "color"]],
            "icon-size": 0.5,
            "icon-anchor": "bottom",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
          }}
        />
      </Source>
      <Source
        id="pin-from"
        type="geojson"
        data={{
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  mapStore.explorePos.longitude,
                  mapStore.explorePos.latitude,
                ],
              },
              properties: { color: "red" },
            },
          ],
        }}
      >
        <Layer
          id="pin-from"
          type="symbol"
          source="pin-from"
          layout={{
            "icon-image": "pin-red",
            "icon-size": 1,
            "icon-anchor": "bottom",
          }}
        />
      </Source>
    </>
  );
}

function RecommendMapLayers({ enabled }: { enabled: boolean }) {
  const mapStore = useMapStore(
    useShallow(
      ({
        filters,
        viewingItineraryId,
        viewingPOI,
        setCurrentSidePanelTab,
        setViewingPOI,
        recommend,
      }) => {
        return {
          filters,
          viewingItineraryId,
          viewingPOI,
          setCurrentSidePanelTab,
          setViewingPOI,
          recommendFromPos: recommend.recommendFromPos,
          recommendViewPos: recommend.recommendViewPos,
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
  const poiPins = useMemo(() => {
    const itineraryPOISSet = new Set(
      itinerariesQuery.data?.pois.map((poi) => poi.id) ?? []
    );
    return poisQuery.data?.map((poi) => {
      // Determine pin color: red for selected POI, green for itinerary POIs, blue for others
      let color = "blue"; // default
      if (
        mapStore.viewingPOI?.type === "existing-poi" &&
        mapStore.viewingPOI.poiId === poi.id
      ) {
        color = "red"; // currently selected POI
      } else if (itineraryPOISSet.has(poi.id)) {
        color = "green"; // POI in current itinerary
      }

      return {
        id: poi.id,
        color: color,
        coordinates: [poi.pos.longitude, poi.pos.latitude],
      };
    });
  }, [poisQuery.data, itinerariesQuery.data, mapStore.viewingPOI]);

  return (
    <>
      <Source
        id="pins"
        type="geojson"
        data={{
          type: "FeatureCollection",
          features:
            poiPins?.map((poi) => {
              const poiPos = poi.coordinates;
              return {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: poiPos,
                },
                properties: {
                  id: poi.id,
                  color: poi.color,
                },
              };
            }) ?? [],
        }}
      >
        <Layer
          id="poi-pins"
          type="symbol"
          source="pins"
          layout={{
            "icon-image": ["concat", "pin-", ["get", "color"]],
            "icon-size": 0.5,
            "icon-anchor": "bottom",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
          }}
        />
      </Source>
      <Source
        id="pin-from"
        type="geojson"
        data={{
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
              properties: { color: "red" },
            },
          ],
        }}
      >
        <Layer
          id="pin-from"
          type="symbol"
          source="pin-from"
          layout={{
            "icon-image": "pin-red",
            "icon-size": 1,
            "icon-anchor": "bottom",
          }}
        />
      </Source>
      {mapStore.recommendViewPos && (
        <Source
          id="pin-view"
          type="geojson"
          data={{
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [
                    mapStore.recommendViewPos.longitude,
                    mapStore.recommendViewPos.latitude,
                  ],
                },
                properties: { color: "orange" },
              },
            ],
          }}
        >
          <Layer
            id="pin-view"
            type="symbol"
            source="pin-from"
            layout={{
              "icon-image": "pin-orange",
              "icon-size": 0.7,
              "icon-anchor": "bottom",
            }}
          />
        </Source>
      )}
    </>
  );
}

export default function ExploreMap({ className }: { className: string }) {
  const mapStore = useMapStore(
    useShallow(
      ({
        currentMapTab,
        setRecommendFromPos,
        setRecommendViewPos,
        setExplorePos,
        setViewingPOI,
        setCurrentSidePanelTab,
        setViewState,
        viewState,
        setTagBadgeOrder,
      }) => {
        return {
          currentMapTab,
          setRecommendFromPos,
          setRecommendViewPos,
          setExplorePos,
          setViewingPOI,
          setCurrentSidePanelTab,
          setViewState,
          viewState,
          setTagBadgeOrder,
        };
      }
    )
  );

  const onMove = useCallback(
    (e: ViewStateChangeEvent) => {
      mapStore.setViewState(e.viewState);
    },
    [mapStore]
  );
  const onLoad = useCallback(async (e: MapEvent) => {
    const map = e.target;

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

    await Promise.all([
      ensurePinImage("red"),
      ensurePinImage("green"),
      ensurePinImage("blue"),
      ensurePinImage("orange"),
    ]);
  }, []);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      const map = e.target;
      if (map.getLayer("poi-pins")) {
        const poiPins = map.queryRenderedFeatures(e.point, {
          layers: ["poi-pins"],
        });
        if (poiPins.length > 0) {
          const poiId = poiPins[0].properties?.id;
          if (poiId) {
            mapStore.setTagBadgeOrder([]); //when a new POI is clicked, reset tag badge order
            mapStore.setViewingPOI({ type: "existing-poi", poiId });
            mapStore.setCurrentSidePanelTab("place");
            if (poiPins[0].geometry?.type === "Point") {
              const coords = poiPins[0].geometry?.coordinates; //coords are lng lat
              mapStore.setExplorePos({
                latitude: coords[1],
                longitude: coords[0],
              });
              mapStore.setRecommendViewPos({
                latitude: coords[1],
                longitude: coords[0],
              });
            }
          }
          return;
        }
      }

      // For recommend map.
      if (mapStore.currentMapTab === "recommend") {
        mapStore.setRecommendFromPos({
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        });
      }
      // For explore map.
      else if (mapStore.currentMapTab == "explore") {
        // TODO: Add stuff here for explore map.
        const pos = { latitude: e.lngLat.lat, longitude: e.lngLat.lng };
        mapStore.setExplorePos(pos);
        mapStore.setViewingPOI({ type: "new-poi", pos });
        mapStore.setCurrentSidePanelTab("place");
      }
    },
    [mapStore]
  );

  return (
    <Map
      mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_PK}
      // initialViewState={{
      //   longitude: 103.8198,
      //   latitude: 1.3521,
      //   zoom: 10,
      // }}
      onMove={onMove}
      latitude={mapStore.viewState.latitude}
      longitude={mapStore.viewState.longitude}
      zoom={mapStore.viewState.zoom}
      onLoad={onLoad}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      onClick={onClick}
    >
      {mapStore.currentMapTab === "explore" && <ExploreMapLayers enabled />}
      {mapStore.currentMapTab === "recommend" && <RecommendMapLayers enabled />}
    </Map>
  );
}
