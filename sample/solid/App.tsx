import { SURFACE_MODE } from "./config.js";
import { formatInteger } from "./lib/format.js";
import { createMarketModel } from "./lib/market-store.js";
import { MarketSurface } from "./components/organisms/MarketSurface.js";
import type { MarketRow, SurfaceCopy, SurfaceMode } from "./types.js";

interface AppProps {
  readonly initialRows: readonly MarketRow[];
}

function getSurfaceCopy(surfaceMode: SurfaceMode): SurfaceCopy {
  if (surfaceMode === "cards") {
    return {
      title: "Live market cards",
      subtitle:
        "Solid updates a denser card grid through fine-grained store invalidation.",
    };
  }

  if (surfaceMode === "editor") {
    return {
      title: "Live market editor",
      subtitle:
        "Solid updates an input-heavy editor surface through fine-grained store invalidation.",
    };
  }

  return {
    title: "Live market board",
    subtitle:
      "Solid updates the row tree through fine-grained store invalidation.",
  };
}

export function App(props: AppProps): JSX.Element {
  const model = createMarketModel(props.initialRows);
  const mountedRowCount = model.rows.length;
  const surfaceCopy = getSurfaceCopy(SURFACE_MODE);

  return (
    <main class="page">
      <section class="hero">
        <div class="hero__top">
          <div>
            <div class="brand-mark">
              <span class="brand-mark__dot"></span>
              <span>Solid / createStore</span>
            </div>
            <h1>
              Same board, but the updates travel through Solid path writes.
            </h1>
            <p>
              This version keeps the same market-board shape and controls, but
              it uses Solid's store graph and path-level writes. When rows
              change, Solid invalidates only the DOM edges touched by those
              store paths.
            </p>
          </div>

          <div class="hero__meta">
            <div class="pill">
              <span>Mounted rows</span>
              <strong>{formatInteger(mountedRowCount)}</strong>
            </div>
            <div class="pill">
              <span>Strategy</span>
              <strong>createStore</strong>
            </div>
            <div class="pill">
              <span>Focused row</span>
              <strong>{formatInteger(model.focusedRowId.value + 1)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__title">
          <h2>{surfaceCopy.title}</h2>
          <span class="panel__subtitle">{surfaceCopy.subtitle}</span>
        </div>
        <MarketSurface
          rows={model.rows}
          surfaceMode={SURFACE_MODE}
          onHoverRow={(rowId) => {
            model.focusRow(rowId);
          }}
        />
      </section>
    </main>
  );
}
