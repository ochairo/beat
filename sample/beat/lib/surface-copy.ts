import type { SurfaceCopy, SurfaceMode } from "../types.js";

export function getSurfaceCopy(surfaceMode: SurfaceMode): SurfaceCopy {
  if (surfaceMode === "cards") {
    return {
      title: "Live market cards",
      subtitle:
        "Mounted once. Updated through direct pulse subscriptions in a denser card grid.",
    };
  }

  if (surfaceMode === "editor") {
    return {
      title: "Live market editor",
      subtitle:
        "Mounted once. Updated through direct pulse subscriptions into input-like controls.",
    };
  }

  return {
    title: "Live market board",
    subtitle: "Mounted once. Updated through direct pulse subscriptions.",
  };
}
