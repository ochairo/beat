import type { SurfaceMode } from "./types.js";

export const SURFACE_MODE = resolveSurfaceMode();
export const DEFAULT_ROW_COUNT = 10000;
export const ROW_COUNT = resolveRowCount(DEFAULT_ROW_COUNT);
export const STORM_WRITES = 6000;
export const SWEEP_FIELDS_PER_ROW = 5;

function resolveSurfaceMode(): SurfaceMode {
  const searchParams = new URLSearchParams(window.location.search);
  const surface = searchParams.get("surface");

  if (surface === "cards" || surface === "editor") {
    return surface;
  }

  return "table";
}

function resolveRowCount(defaultCount: number, maxCount = 50000): number {
  if (typeof window === "undefined") {
    return defaultCount;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const requested = Number(searchParams.get("rows"));

  if (!Number.isFinite(requested) || requested <= 0) {
    return defaultCount;
  }

  return Math.min(Math.floor(requested), maxCount);
}
