import type { SurfaceMode } from "./types.js";

export const SURFACE_MODE = resolveSurfaceMode();
export const ROW_COUNT = resolveRowCount(10000);
export const SWEEP_FIELDS_PER_ROW = 5;
export const STORM_WRITES = 6000;

function resolveSurfaceMode(): SurfaceMode {
  const searchParams = new URLSearchParams(window.location.search);
  const surface = searchParams.get("surface");

  if (surface === "cards" || surface === "editor") {
    return surface;
  }

  return "table";
}

function resolveRowCount(defaultCount: number, maxCount = 50000): number {
  const searchParams = new URLSearchParams(window.location.search);
  const requested = Number(searchParams.get("rows"));

  if (!Number.isFinite(requested) || requested <= 0) {
    return defaultCount;
  }

  return Math.min(Math.floor(requested), maxCount);
}
