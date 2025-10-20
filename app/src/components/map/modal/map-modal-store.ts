import { create } from "zustand";

export type MapModalAction =
  | {
      type: "itinerary-poi-review";
      options: {
        poiId: number;
      };
    }
  | {
      type: "create-itinerary";
      options: {
        longitude: number;
        latitude: number;
        poiId?: number; // Make poiId optional
      };
    }
  | {
      type: "delete-itinerary";
      options: {
        itineraryId: number;
        itineraryName: string;
      };
    }
  | {
      type: "rename-itinerary";
      options: {
        itineraryId: number;
        currentName: string;
      };
    }
  | {
      type: "remove-poi-from-itinerary";
      options: {
        itineraryId: number;
        poiId: number;
        poiName: string;
      };
    }
  | {
      type: "delete-review";
      options: {
        reviewId: number;
        poiId: number;
      };
    }
  | {
      type: "create-poi";
      options: {
        address: string;
        longitude: number;
        latitude: number;
        name: string;
        description: string;
        images: string[];
      };
    } 
  | {
      type: "poi-image-carousel";
      options: {
        poiId: number;
        name: string;
      };
    }
  | {
      type: "upload-poi-image";
      options: {
        poiId: number;
        name: string;
        images: string[];
      };
    }
  | {
      type: "review-image-carousel";
      options: {
        reviewId: number;
        images: string[];
        reviewComment: string;
      };
    };

export type ExtractOptions<T extends MapModalAction["type"]> = Extract<
  MapModalAction,
  { type: T }
>["options"];

export type MapModalStore = {
  action: MapModalAction | null;
  setAction: (action: MapModalAction | null, refreshKey?: boolean) => void;
};

export const useMapModalStore = create<MapModalStore>((set, get) => ({
  action: null,
  setAction: (action) => {
    if (action === null) {
      return set({
        action: null,
      });
    }
    return set({
      action: action,
    });
  },
}));