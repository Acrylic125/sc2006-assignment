"use client";

import { useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import { env } from "@/lib/env";

import "mapbox-gl/dist/mapbox-gl.css";

export function ExploreMap({ className }: { className: string }) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_PK;
    // Marina Bay Sands coordinates [lng, lat]
    // const marinaBaySands: [number, number] = [103.8607, 1.2834];
    const marinaBaySands: [number, number] = [103.8607, 1.2834];

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: marinaBaySands,
      zoom: 15,
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  return <div id="map-container" ref={mapContainerRef} className={className} />;
}
