"use client";

import { useCallback, useMemo } from "react";
import { MapEvent, MapMouseEvent } from "mapbox-gl";
import { env } from "@/lib/env";

import "mapbox-gl/dist/mapbox-gl.css";
import { useMapStore } from "./map-store";
import { useShallow } from "zustand/react/shallow";
import { trpc } from "@/server/client";
import Map, { Layer, Source, ViewStateChangeEvent } from "react-map-gl/mapbox";
import { useMapProvider } from "./map-provider";
import { useThemeStore } from "../theme-store";
import { Button } from "../ui/button";
import { Locate, Minus, Plus, Sparkle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "../ui/dropdown-menu";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

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

function createBubbleURL(color: string) {
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(`
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="32" fill="${color}" fill-opacity="0.5" />
      <circle cx="32" cy="32" r="6" fill="white" />
    </svg>
    `)
  );
}

function createAddPin() {
  const svg = `<svg width="32" height="64" viewBox="0 0 32 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="16" cy="48" r="16" fill="#7BF1A8" fill-opacity="0.5"/>
<circle cx="16" cy="48" r="6" fill="white"/>
<mask id="path-3-inside-1_55_15" fill="white">
<path d="M16 0C24.8366 0 32 7.16344 32 16C32 27.5 28.3233 36.8858 15.75 48C3.77669 35.3588 0.245448 28.3406 0.0107422 16.5459C0.00466547 16.3647 0 16.1827 0 16C0 7.16353 7.16356 0.00013195 16 0Z"/>
</mask>
<path d="M16 0C24.8366 0 32 7.16344 32 16C32 27.5 28.3233 36.8858 15.75 48C3.77669 35.3588 0.245448 28.3406 0.0107422 16.5459C0.00466547 16.3647 0 16.1827 0 16C0 7.16353 7.16356 0.00013195 16 0Z" fill="#008236"/>
<rect x="14" y="9" width="4" height="16" rx="2" fill="#ffffff"/>
<rect x="8" y="15" width="16" height="4" rx="2" fill="#ffffff"/>
</svg>
`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const pins = {
  red: createPinURL("#FB2C36"),
  yellow: createPinURL("#efb100"),
  blue_bubble: createBubbleURL("#3B82F6"),
  red_bubble: createBubbleURL("#ff6467"),
  green_bubble: createBubbleURL("#10B981"),
  gray_bubble: createBubbleURL("#90a1b9"),
  add_pin: createAddPin(),
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

  const MIN_PIN_SIZE = 1;
  const MAX_PIN_SIZE = 2;
  const poiPins = useMemo(() => {
    if (!poisQuery.data || poisQuery.data.length === 0) {
      return [];
    }
    const minScore = Math.min(
      ...poisQuery.data.map((poi) => poi.popularityScore)
    );
    const maxScore = Math.max(
      ...poisQuery.data.map((poi) => poi.popularityScore)
    );
    return poisQuery.data?.map((poi) => {
      // Determine pin color: red for selected POI, green for itinerary POIs, blue for others
      let color = "blue_bubble"; // default
      if (
        mapStore.viewingPOI?.type === "existing-poi" &&
        mapStore.viewingPOI.poiId === poi.id
      ) {
        color = "red_bubble"; // currently selected POI
      }
      let poiScale = MIN_PIN_SIZE;
      if (maxScore === minScore) {
        poiScale = (MIN_PIN_SIZE + MAX_PIN_SIZE) / 2;
      } else {
        poiScale =
          MIN_PIN_SIZE +
          ((poi.popularityScore - minScore) / (maxScore - minScore)) *
            (MAX_PIN_SIZE - MIN_PIN_SIZE);
      }

      return {
        id: poi.id,
        color: color,
        coordinates: [poi.pos.longitude, poi.pos.latitude],
        scale: poiScale,
      };
    });
  }, [poisQuery.data, mapStore.viewingPOI]);

  return (
    <>
      <Source
        id="pins"
        type="geojson"
        cluster={true}
        clusterRadius={40}
        clusterMaxZoom={12}
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
                  scale: poi.scale,
                },
              };
            }) ?? [],
        }}
      >
        <Layer
          id="clusters"
          type="circle"
          source="pins"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": "#8ec5ff",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              24, // radius for clusters with less than 10 points
              10,
              36, // radius for clusters with 10-30 points
              30,
              48, // radius for clusters with 30+ points
            ],
            "circle-opacity": 0.6,
          }}
        />
        <Layer
          id="poi-pins"
          type="symbol"
          source="pins"
          layout={{
            "icon-image": ["concat", "pin-", ["get", "color"]],
            "icon-size": ["get", "scale"],
            "icon-anchor": "center",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
          }}
        />
      </Source>
      <Source
        id="poi-pins-itinerary"
        type="geojson"
        cluster={false}
        data={{
          type: "FeatureCollection",
          features:
            itinerariesQuery.data?.pois.map((poi) => {
              return {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [poi.longitude, poi.latitude],
                },
                properties: {},
              };
            }) ?? [],
        }}
      >
        <Layer
          id="poi-pins-itinerary"
          type="symbol"
          source="poi-pins-itinerary"
          layout={{
            "icon-image": "pin-yellow",
            "icon-size": 1,
            "icon-anchor": "bottom",
          }}
        />
      </Source>
      {mapStore.explorePos && (
        <Source
          id="explore-pin-from"
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
                properties: {},
              },
            ],
          }}
        >
          <Layer
            id="explore-pin-from"
            type="symbol"
            source="explore-pin-from"
            layout={{
              "icon-image": "pin-add_pin",
              "icon-size": 2,
              "icon-anchor": "bottom",
            }}
          />
        </Source>
      )}
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

  const MIN_PIN_SIZE = 1;
  const MAX_PIN_SIZE = 2;
  const poiPins = useMemo(() => {
    if (!poisQuery.data) {
      return {
        recommended: [],
        others: [],
      };
    }

    let recommended: {
      id: number;
      color: string;
      coordinates: [number, number];
      scale: number;
    }[] = [];
    let others: {
      id: number;
      color: string;
      coordinates: [number, number];
      scale: number;
    }[] = [];
    if (poisQuery.data.recommended.length > 0) {
      const minScore = Math.min(
        ...poisQuery.data.recommended.map((poi) => poi.popularityScore)
      );
      const maxScore = Math.max(
        ...poisQuery.data.recommended.map((poi) => poi.popularityScore)
      );
      recommended = poisQuery.data.recommended.map((poi) => {
        let color = "blue_bubble"; // default
        if (
          mapStore.viewingPOI?.type === "existing-poi" &&
          mapStore.viewingPOI.poiId === poi.id
        ) {
          color = "red_bubble"; // currently selected POI
        }
        let poiScale = MIN_PIN_SIZE;
        if (maxScore === minScore) {
          poiScale = (MIN_PIN_SIZE + MAX_PIN_SIZE) / 2;
        } else {
          poiScale =
            MIN_PIN_SIZE +
            ((poi.popularityScore - minScore) / (maxScore - minScore)) *
              (MAX_PIN_SIZE - MIN_PIN_SIZE);
        }

        return {
          id: poi.id,
          color: color,
          coordinates: [poi.pos.longitude, poi.pos.latitude],
          scale: poiScale,
        };
      });
    }
    if (poisQuery.data.others.length > 0) {
      others = poisQuery.data.others.map((poi) => {
        let color = "gray_bubble"; // default
        if (
          mapStore.viewingPOI?.type === "existing-poi" &&
          mapStore.viewingPOI.poiId === poi.id
        ) {
          color = "red_bubble"; // currently selected POI
        }
        return {
          id: poi.id,
          color: color,
          coordinates: [poi.pos.longitude, poi.pos.latitude],
          scale: 0.5,
        };
      });
    }

    return {
      recommended,
      others,
    };
  }, [poisQuery.data, mapStore.viewingPOI]);

  return (
    <>
      <Source
        id="pins-others"
        type="geojson"
        cluster={true}
        clusterRadius={40}
        clusterMaxZoom={15}
        data={{
          type: "FeatureCollection",
          features:
            poiPins.others.map((poi) => {
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
                  scale: poi.scale,
                },
              };
            }) ?? [],
        }}
      >
        <Layer
          id="poi-pins-others"
          type="symbol"
          source="pins-others"
          layout={{
            "icon-image": ["concat", "pin-", ["get", "color"]],
            "icon-size": ["get", "scale"],
            "icon-anchor": "center",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
          }}
        />
      </Source>
      <Source
        id="pins"
        type="geojson"
        data={{
          type: "FeatureCollection",
          features:
            poiPins.recommended.map((poi) => {
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
                  scale: poi.scale,
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
            "icon-size": ["get", "scale"],
            "icon-anchor": "center",
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "icon-allow-overlap": true, //allow overlapping icons because our pins can get big
          }}
        />
      </Source>
      <Source
        id="poi-pins-itinerary"
        type="geojson"
        cluster={false}
        data={{
          type: "FeatureCollection",
          features:
            itinerariesQuery.data?.pois.map((poi) => {
              return {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [poi.longitude, poi.latitude],
                },
                properties: {},
              };
            }) ?? [],
        }}
      >
        <Layer
          id="poi-pins-itinerary"
          type="symbol"
          source="poi-pins-itinerary"
          layout={{
            "icon-image": "pin-yellow",
            "icon-size": 1,
            "icon-anchor": "bottom",
          }}
        />
      </Source>
      <Source
        id="recommend-pin-from"
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
          id="recommend-pin-from"
          type="symbol"
          source="recommend-pin-from"
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

export default function ExploreMap({ className }: { className: string }) {
  const { mapRef } = useMapProvider();
  const { theme } = useThemeStore(useShallow(({ theme }) => ({ theme })));
  const mapStore = useMapStore(
    useShallow(
      ({
        currentMapTab,
        setRecommendFromPos,
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
      ensurePinImage("yellow"),
      ensurePinImage("blue_bubble"),
      ensurePinImage("red_bubble"),
      ensurePinImage("green_bubble"),
      ensurePinImage("gray_bubble"),
      ensurePinImage("add_pin"),
    ]);
  }, []);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      const map = e.target;
      const layers: string[] = [];
      const possibleLayers = [
        "poi-pins",
        "poi-pins-others",
        "poi-pins-itinerary",
      ];
      for (const layer of possibleLayers) {
        if (map.getLayer(layer)) {
          layers.push(layer);
        }
      }

      const poiPins = map.queryRenderedFeatures(e.point, {
        layers,
      });
      if (poiPins.length > 0) {
        const poiId = poiPins[0].properties?.id;
        if (poiId && typeof poiId === "number") {
          mapStore.setTagBadgeOrder([]); //when a new POI is clicked, reset tag badge order
          mapStore.setCurrentSidePanelTab("place");
          mapStore.setViewingPOI({
            type: "existing-poi",
            poiId,
          });
          // Reset explore pos when a new POI is clicked(set though the cluster layer)
          if (mapStore.currentMapTab === "explore") {
            mapStore.setExplorePos(null);
          }
        }
        return;
      }
      if (map.getLayer("clusters") && mapStore.currentMapTab === "explore") {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        if (features.length) {
          const clusterFeature = features[0];
          const clusterId = clusterFeature.properties?.cluster_id;
          const source = map.getSource("pins");
          if (source && "getClusterExpansionZoom" in source) {
            (source as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
              clusterId,
              (err, zoom) => {
                if (err || zoom == null) return;

                if (clusterFeature.geometry.type === "Point") {
                  const [lng, lat] = clusterFeature.geometry.coordinates;
                  map.easeTo({
                    center: [lng, lat],
                    zoom: zoom,
                  });
                }
              }
            );
          }
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
      ref={mapRef}
      mapboxAccessToken={env.NEXT_PUBLIC_MAPBOX_PK}
      onMove={onMove}
      latitude={mapStore.viewState.latitude}
      longitude={mapStore.viewState.longitude}
      zoom={mapStore.viewState.zoom}
      onLoad={onLoad}
      // Dark mode map
      mapStyle={
        theme === "dark"
          ? "mapbox://styles/mapbox/navigation-night-v1"
          : "mapbox://styles/mapbox/streets-v12"
      }
      key={theme}
      // mapStyle="mapbox://styles/mapbox/streets-v12"
      onClick={onClick}
    >
      {mapStore.currentMapTab === "explore" && <ExploreMapLayers enabled />}
      {mapStore.currentMapTab === "recommend" && <RecommendMapLayers enabled />}
    </Map>
  );
}

export function MapControls() {
  const map = useMapProvider();
  return (
    <div className="flex flex-row gap-2 absolute top-4 right-4">
      <Button
        variant="secondary"
        size="icon"
        onClick={() => {
          // Center at Singapore.
          map.mapRef.current?.flyTo({
            center: [103.8198, 1.3521],
            zoom: 10,
          });
        }}
      >
        <Locate />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={() => {
          map.mapRef.current?.zoomIn();
        }}
      >
        <Plus />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={() => {
          map.mapRef.current?.zoomOut();
        }}
      >
        <Minus />
      </Button>
    </div>
  );
}

export function MapHintTopBar() {
  const mapStore = useMapStore(
    useShallow(({ currentMapTab }) => ({ currentMapTab }))
  );
  if (mapStore.currentMapTab === "explore") {
    return (
      <div className="absolute top-4 left-1/2 right-1/2 z-20 -translate-x-1/2 p-2 w-md bg-background/50 backdrop-blur-md rounded-full">
        <p className="text-center w-full text-muted-foreground">
          Click on <span className="text-primary font-bold">Pin to view</span>{" "}
          OR{" "}
          <span className="text-primary font-bold">Map to add a new place</span>
          .
        </p>
      </div>
    );
  }
  return (
    <div className="absolute top-4 left-1/2 right-1/2 z-20 -translate-x-1/2 p-2 w-md bg-background/50 backdrop-blur-md rounded-full">
      <p className="text-center w-full text-muted-foreground">
        Click on <span className="text-primary font-bold">Pin to view</span> OR{" "}
        <span className="text-primary font-bold">
          Map to view recommendations
        </span>
        .
      </p>
    </div>
  );
}

export function MapViewTabGroupDropdown() {
  const auth = useAuth();
  const mapStore = useMapStore(
    useShallow(({ currentMapTab, setCurrentMapTab }) => ({
      currentMapTab,
      setCurrentMapTab,
    }))
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <span className="hidden sm:block">
            {mapStore.currentMapTab === "explore" ? "Explore" : "Recommend"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Map View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={mapStore.currentMapTab === "explore"}
          onCheckedChange={() => mapStore.setCurrentMapTab("explore")}
        >
          Explore
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={mapStore.currentMapTab === "recommend"}
          onCheckedChange={() => mapStore.setCurrentMapTab("recommend")}
        >
          Recommend
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {auth.isSignedIn ? (
          <DropdownMenuItem asChild>
            <Link href="/surprise-me">
              <div className="flex flex-row items-center gap-2">
                <Sparkle />
                <span>Surprise Me!</span>
              </div>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <div className="flex items-center gap-2">
              <span>Sign in to use Surprise Me</span>
            </div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
