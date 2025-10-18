"use client";

import { createContext, RefObject, useContext, useRef } from "react";
import { MapRef } from "react-map-gl/mapbox";

const MapContext = createContext<{
  mapRef: RefObject<MapRef | null>;
}>({
  mapRef: { current: null },
});

export function useMapProvider() {
  return useContext(MapContext);
}

export function MapProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<MapRef | null>(null);
  return (
    <MapContext.Provider
      value={{
        mapRef: mapRef,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}
