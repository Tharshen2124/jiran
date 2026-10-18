"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import type { ExpressionSpecification, GeoJSONSource, Map } from "mapbox-gl";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { TICK_MS, useLiveLocation } from "./client";
import type { Section } from "@/lib/patrols";

// Mapbox can't read the CSS theme, so these mirror --color-success-ink and --color-brand.
const PATROLLED = "#1e8a4f";
const NOT_PATROLLED = "#d71920";
const COLOR: ExpressionSpecification = ["case", ["get", "patrolled"], PATROLLED, NOT_PATROLLED];

// Each section is drawn as its street line, plus a dot on its checkpoint.
const toGeoJSON = (sections: Section[]): Parameters<GeoJSONSource["setData"]>[0] => ({
  type: "FeatureCollection",
  features: sections.flatMap(({ path, lat, lng, patrolled }) => [
    { type: "Feature", properties: { patrolled }, geometry: { type: "LineString", coordinates: path } },
    { type: "Feature", properties: { patrolled }, geometry: { type: "Point", coordinates: [lng, lat] } },
  ]),
});

export function PatrolMap({ token, sections }: { token: string; sections: Section[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Map>(null);
  const latest = useRef(sections);
  const { on } = useLiveLocation();
  const sharing = useRef(on);
  const router = useRouter();

  useEffect(() => {
    latest.current = sections;
    sharing.current = on;
  });

  // mapbox-gl touches `window` on import, so it's loaded only in the browser.
  useEffect(() => {
    let m: Map | undefined;
    let gone = false;
    import("mapbox-gl").then(({ default: mapboxgl }) => {
      if (gone) return;
      const lngs = sections.flatMap((s) => s.path.map((p) => p[0]));
      const lats = sections.flatMap((s) => s.path.map((p) => p[1]));
      m = new mapboxgl.Map({
        accessToken: token,
        container: el.current!,
        style: "mapbox://styles/mapbox/standard",
        config: { basemap: { showPointOfInterestLabels: false } },
        bounds: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
        fitBoundsOptions: { padding: 32 },
      });
      const locate = new mapboxgl.GeolocateControl({ trackUserLocation: true, showUserHeading: true, positionOptions: { enableHighAccuracy: true } });
      m.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
      m.addControl(locate);
      m.on("load", () => {
        m!.addSource("patrol", { type: "geojson", data: toGeoJSON(latest.current) });
        m!.addLayer({
          id: "sections",
          type: "line",
          slot: "middle",
          source: "patrol",
          filter: ["==", ["geometry-type"], "LineString"],
          layout: { "line-cap": "round" },
          paint: { "line-color": COLOR, "line-width": ["interpolate", ["linear"], ["zoom"], 15, 4, 18, 10], "line-opacity": 0.85 },
        });
        m!.addLayer({
          id: "checkpoints",
          type: "circle",
          slot: "top",
          source: "patrol",
          filter: ["==", ["geometry-type"], "Point"],
          paint: { "circle-color": COLOR, "circle-radius": 7, "circle-stroke-color": "#fff", "circle-stroke-width": 2 },
        });
        map.current = m!;
        // Show the guard where they are as soon as they're sharing.
        if (sharing.current) locate.trigger();
      });
    });
    return () => {
      gone = true;
      m?.remove();
      map.current = null;
    };
    // The map is built once; section updates go through setData below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    (map.current?.getSource("patrol") as GeoJSONSource | undefined)?.setData(toGeoJSON(sections));
  }, [sections]);

  // While sharing, the database may mark a checkpoint at any tick, so pick that up at the same pace.
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => router.refresh(), TICK_MS);
    return () => clearInterval(timer);
  }, [on, router]);

  return <div ref={el} role="region" aria-label="Patrol map" className="h-[60svh] min-h-80 overflow-hidden rounded-2xl bg-surface-2" />;
}
