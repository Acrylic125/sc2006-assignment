/**
 * Think of this as the controller, or rather, the states
 * held by the map. However, these states only last as
 * as the app is opened.
 *
 * NOTE: This is called global state. (Think singleton).
 * See: https://zustand.docs.pmnd.rs/getting-started/introduction
 */

import { create } from "zustand";

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
        latitude: number;
        longitude: number;
      };
    };

type MapStore = {
  viewingItineraryId: number | null;
  viewingPOI: ViewingPOI | null;
  currentMapTab: "explore" | "recommend";
  currentSidePanelTab: "itinerary" | "place";
  recommend: {
    recommendFromPos: Coordinates;
  };
  filters: {
    showVisited: boolean;
    showUnvisited: boolean;
    excludedTags: Set<number>;
  };
  setViewingItineraryId: (itineraryId: number | null) => void;
  setCurrentMapTab: (tab: "explore" | "recommend") => void;
  setCurrentSidePanelTab: (tab: "itinerary" | "place") => void;
  setFilterExcludedTags: (tags: Set<number>) => void;
  setFilterShowVisited: (showVisited: boolean) => void;
  setFilterShowUnvisited: (showUnvisisted: boolean) => void;
  setRecommendFromPos: (pos: Coordinates) => void;
  setViewingPOI: (poi: ViewingPOI) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  viewingItineraryId: null,
  viewingPOI: null,
  currentMapTab: "explore",
  currentSidePanelTab: "place",
  recommend: {
    recommendFromPos: { latitude: 1.3521, longitude: 103.8198 },
  },
  filters: {
    showVisited: true,
    showUnvisited: true,
    excludedTags: new Set(),
  },
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

  //   setExplorePois: (pois: { id: number; pos: Coordinates }[]) =>
  //     set({ explore: { pois } }),
  //   setRecommendPois: (pois: { id: number; pos: Coordinates }[]) =>
  //     set({ recommend: { pois } }),
}));
