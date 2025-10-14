/**
 * Think of this as the controller, or rather, the states
 * held by the map. However, these states only last as
 * as the app is opened.
 *
 * NOTE: This is called global state. (Think singleton).
 * See: https://zustand.docs.pmnd.rs/getting-started/introduction
 */

import { create } from "zustand";
import mapboxgl from "mapbox-gl";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ViewingPOI =
  | {
      type: "existing-poi";
      poiId: number;
    }
  | {
      type: "new-poi";
      pos: {
        name: string;
        description: string;
        latitude: number;
        longitude: number;
        images: string[];
      };
    };

type MapStore = {
  mapInstance: mapboxgl.Map | null;
  viewingItineraryId: number | null;
  viewingPOI: ViewingPOI | null;
  currentMapTab: "explore" | "recommend";
  currentSidePanelTab: "itinerary" | "place";
  viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  recommend: {
    recommendFromPos: Coordinates;
  };
  filters: {
    showVisited: boolean;
    showUnvisited: boolean;
    excludedTags: Set<number>;
  };
  setMapInstance: (map: mapboxgl.Map | null) => void;
  setViewState: (viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
  }) => void;
  setViewingItineraryId: (itineraryId: number | null) => void;
  setCurrentMapTab: (tab: "explore" | "recommend") => void;
  setCurrentSidePanelTab: (tab: "itinerary" | "place") => void;
  setFilterExcludedTags: (tags: Set<number>) => void;
  setFilterShowVisited: (showVisited: boolean) => void;
  setFilterShowUnvisited: (showUnvisisted: boolean) => void;
  setRecommendFromPos: (pos: Coordinates) => void;
  setViewingPOI: (poi: ViewingPOI) => void;
  centerMapOnPOI: (latitude: number, longitude: number) => void;
};

export const useMapStore = create<MapStore>((set, get) => ({
  mapInstance: null,
  viewingItineraryId: null,
  viewingPOI: null,
  currentMapTab: "explore",
  currentSidePanelTab: "place",
  viewState: {
    latitude: 1.3521,
    longitude: 103.8198,
    zoom: 10,
  },
  recommend: {
    recommendFromPos: { latitude: 1.3521, longitude: 103.8198 },
  },
  filters: {
    showVisited: true,
    showUnvisited: true,
    excludedTags: new Set(),
  },
  setMapInstance: (map: mapboxgl.Map | null) => set({ mapInstance: map }),
  setViewState: (viewState: {
    latitude: number;
    longitude: number;
    zoom: number;
  }) => set({ viewState }),
  setViewingItineraryId: (itineraryId: number | null) =>
    set({ viewingItineraryId: itineraryId }),
  setCurrentMapTab: (tab: "explore" | "recommend") =>
    set({ currentMapTab: tab }),
  setCurrentSidePanelTab: (tab: "itinerary" | "place") =>
    set({ currentSidePanelTab: tab }),
  setFilterExcludedTags: (tags: Set<number>) =>
    set((prev) => ({ filters: { ...prev.filters, excludedTags: tags } })),
  setFilterShowVisited: (showVisited: boolean) =>
    set((prev) => ({ filters: { ...prev.filters, showVisited } })),
  setFilterShowUnvisited: (showUnvisited: boolean) =>
    set((prev) => ({ filters: { ...prev.filters, showUnvisited } })),
  setRecommendFromPos: (pos: Coordinates) =>
    set({ recommend: { recommendFromPos: pos } }),
  setViewingPOI: (poi: ViewingPOI | null) => set({ viewingPOI: poi }),
  centerMapOnPOI: (latitude: number, longitude: number) => {
    const { mapInstance } = get();
    if (mapInstance) {
      mapInstance.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 1000, // Animation duration in milliseconds
      });
    }
  },

  //   setExplorePois: (pois: { id: number; pos: Coordinates }[]) =>
  //     set({ explore: { pois } }),
  //   setRecommendPois: (pois: { id: number; pos: Coordinates }[]) =>
  //     set({ recommend: { pois } }),
}));
