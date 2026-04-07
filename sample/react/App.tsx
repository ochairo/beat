import { useMemo } from "react";
import { SURFACE_MODE } from "./config.js";
import { formatInteger } from "./lib/format.js";
import { createMarketStore, useFocusedRowId } from "./lib/market-store.js";
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
        "React updates a denser card grid through row-level subscriptions.",
    };
  }

  if (surfaceMode === "editor") {
    return {
      title: "Live market editor",
      subtitle:
        "React updates an input-heavy editor surface through row-level subscriptions.",
    };
  }

  return {
    title: "Live market board",
    subtitle: "React updates the row tree through row-level subscriptions.",
  };
}

export function App(props: AppProps): JSX.Element {
  const store = useMemo(
    () => createMarketStore(props.initialRows),
    [props.initialRows],
  );
  const focusedRowId = useFocusedRowId(store);
  const rowIds = store.rowIds;
  const mountedRowCount = rowIds.length;
  const surfaceCopy = getSurfaceCopy(SURFACE_MODE);

  return (
    <main className="page">
      <section className="hero">
        <div className="hero__top">
          <div>
            <div className="brand-mark">
              <span className="brand-mark__dot"></span>
              <span>React / useSyncExternalStore</span>
            </div>
            <h1>
              Same board, but the updates travel through React subscriptions.
            </h1>
            <p>
              This version keeps the same market-board shape and controls, but
              it uses row-level React subscriptions through a local external
              store. When rows change, only subscribed React rows need to
              reconcile.
            </p>
          </div>

          <div className="hero__meta">
            <div className="pill">
              <span>Mounted rows</span>
              <strong>{formatInteger(mountedRowCount)}</strong>
            </div>
            <div className="pill">
              <span>Strategy</span>
              <strong>subscriptions</strong>
            </div>
            <div className="pill">
              <span>Focused row</span>
              <strong>{formatInteger(focusedRowId + 1)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel__title">
          <h2>{surfaceCopy.title}</h2>
          <span className="panel__subtitle">{surfaceCopy.subtitle}</span>
        </div>
        <MarketSurface
          rowIds={rowIds}
          store={store}
          surfaceMode={SURFACE_MODE}
        />
      </section>
    </main>
  );
}
