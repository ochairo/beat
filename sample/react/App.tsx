import { useMemo, type JSX } from "react";
import { flushSync } from "react-dom";
import { STORM_WRITES, SURFACE_MODE, SWEEP_FIELDS_PER_ROW } from "./config.js";
import { BenchmarkControls } from "./components/molecules/BenchmarkControls.js";
import { MetricsGrid } from "./components/molecules/MetricsGrid.js";
import { formatInteger } from "./lib/format.js";
import {
  createMarketStore,
  useFocusedRowId,
  useMetrics,
} from "./lib/market-store.js";
import { updateMetrics, waitForVisualSettle } from "./lib/metrics.js";
import { MarketSurface } from "./components/organisms/MarketSurface.js";
import type { MarketRow, Mode, SurfaceCopy, SurfaceMode } from "./types.js";

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
  const metrics = useMetrics(store);
  const rowIds = store.rowIds;
  const mountedRowCount = rowIds.length;
  const surfaceCopy = getSurfaceCopy(SURFACE_MODE);

  const runMeasured = async (
    label: string,
    mode: Mode,
    execute: () => number,
  ): Promise<void> => {
    let writes = 0;
    const startedAt = performance.now();
    flushSync(() => {
      writes = execute();
    });
    const writeMs = performance.now() - startedAt;

    await waitForVisualSettle();

    const totalMs = performance.now() - startedAt;
    const visualMs = Math.max(0, totalMs - writeMs);

    store.updateMetrics((previous) =>
      updateMetrics(
        previous,
        {
          writeMs,
          visualMs,
          totalMs,
        },
        writes,
        mode,
        label,
      ),
    );
  };

  const runBatchedSweep = async (): Promise<void> => {
    await runMeasured("Batched sweep", "batched", () => {
      store.batch(() => {
        for (const rowId of rowIds) {
          store.mutateRow(rowId);
        }
      });
      return rowIds.length * SWEEP_FIELDS_PER_ROW;
    });
  };

  const runWriteStorm = async (): Promise<void> => {
    await runMeasured("Write storm", "batched", () => {
      store.batch(() => {
        for (let index = 0; index < STORM_WRITES; index += 1) {
          const rowId = rowIds[index % rowIds.length];
          if (rowId === undefined) {
            continue;
          }

          store.stormRow(rowId);
        }
      });
      return STORM_WRITES * 3;
    });
  };

  const runFirstRowChange = async (): Promise<void> => {
    await runMeasured("First-row change", "single", () => {
      const rowId = rowIds[0];
      if (rowId === undefined) {
        return 0;
      }

      store.mutateRow(rowId);
      return SWEEP_FIELDS_PER_ROW;
    });
  };

  const hoverRow = async (rowId: number): Promise<void> => {
    if (rowId === store.getFocusedRowId()) {
      return;
    }

    await runMeasured("Focus shift", "batched", () => {
      store.batch(() => {
        store.focusRow(rowId);
      });
      return 3;
    });
  };

  return (
    <main className="page">
      <section className="hero">
        <div className="hero__top">
          <div>
            <div className="brand-mark">
              <span className="brand-mark__dot"></span>
              <span>React sample / one app shell</span>
            </div>
            <h1>
              One SPA shell for interactive use and repeatable workload runs.
            </h1>
            <p>
              This sample keeps the same market-board shape and controls,
              renders the same real UI for interactive use and workload runs,
              and routes row updates through a local store plus row-level React
              subscriptions.
            </p>
          </div>

          <div className="hero__meta">
            <div className="pill">
              <span>Mounted rows</span>
              <strong>{formatInteger(mountedRowCount)}</strong>
            </div>
            <div className="pill">
              <span>Update model</span>
              <strong>React row subscriptions</strong>
            </div>
            <div className="pill">
              <span>Focused row</span>
              <strong>{formatInteger(focusedRowId + 1)}</strong>
            </div>
          </div>
        </div>

        <div className="hero__bottom">
          <BenchmarkControls
            rowCount={rowIds.length}
            onRunBatchedSweep={runBatchedSweep}
            onRunWriteStorm={runWriteStorm}
            onRunFirstRowChange={runFirstRowChange}
          />
          <MetricsGrid metrics={metrics} />
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
          onHoverRow={(rowId) => {
            void hoverRow(rowId);
          }}
        />
      </section>
    </main>
  );
}
