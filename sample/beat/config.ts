import type { NoteItem, SurfaceMode } from "./types.js";

export const SURFACE_MODE = resolveSurfaceMode();
export const ROW_COUNT = resolveRowCount(10000);
export const SWEEP_FIELDS_PER_ROW = 5;
export const STORM_WRITES = 6000;

export const NOTE_ITEMS: readonly NoteItem[] = [
  {
    title: "Static DOM after mount",
    description:
      "The shell renders through Beat components, while each market row stays mounted and updates only the touched bindings.",
  },
  {
    title: "Pulse-native row writes",
    description:
      "Beat updates Pulse row objects directly instead of routing changes through a rerender loop.",
  },
  {
    title: "Public Beat API",
    description:
      "This sample uses createRoot(), component(), For, and Beat's public DOM binding helpers instead of internal source modules.",
  },
];

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
