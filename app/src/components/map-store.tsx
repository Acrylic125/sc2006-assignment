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

type MapStore = {
  viewingItineraryId: number | null;
  currentMapTab: "explore" | "recommend";
  currentSidePanelTab: "itinerary" | "place";
  explore: {
    pois: {
      id: number;
      pos: Coordinates;
    }[];
  };
  recommend: {
    recommendFromPos: Coordinates;
    pois: {
      id: number;
      pos: Coordinates;
    }[];
  };
  setViewingItineraryId: (itineraryId: number | null) => void;
  setCurrentMapTab: (tab: "explore" | "recommend") => void;
  setCurrentSidePanelTab: (tab: "itinerary" | "place") => void;
  //   setExplorePois: (pois: { id: number; pos: Coordinates }[]) => void;
  //   setRecommendPois: (pois: { id: number; pos: Coordinates }[]) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  viewingItineraryId: null,
  currentMapTab: "explore",
  currentSidePanelTab: "itinerary",
  explore: {
    pois: [],
  },
  recommend: {
    recommendFromPos: { latitude: 0, longitude: 0 },
    pois: [],
  },
  setViewingItineraryId: (itineraryId: number | null) =>
    set({ viewingItineraryId: itineraryId }),
  setCurrentMapTab: (tab: "explore" | "recommend") =>
    set({ currentMapTab: tab }),
  setCurrentSidePanelTab: (tab: "itinerary" | "place") =>
    set({ currentSidePanelTab: tab }),
  //   setExplorePois: (pois: { id: number; pos: Coordinates }[]) =>
  //     set({ explore: { pois } }),
  //   setRecommendPois: (pois: { id: number; pos: Coordinates }[]) =>
  //     set({ recommend: { pois } }),
}));
