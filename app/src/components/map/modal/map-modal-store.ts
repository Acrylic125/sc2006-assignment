import { create } from "zustand";

export type MapModalAction = {
  type: "itinerary-poi-review";
  options: {
    poiId: number;
  };
} | {
  type: "create-itinerary";
  options: {};
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
