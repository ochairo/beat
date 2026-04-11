import { batch } from "solid-js";
import { STORM_WRITES, SURFACE_MODE, SWEEP_FIELDS_PER_ROW } from "./config.js";
import { BenchmarkControls } from "./components/molecules/BenchmarkControls.js";
import { MetricsGrid } from "./components/molecules/MetricsGrid.js";
import { formatInteger } from "./lib/format.js";
import { createMarketModel } from "./lib/market-store.js";
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

  const runMeasured = async (
    label: string,
    mode: Mode,
    execute: () => number,
  ): Promise<void> => {
    const startedAt = performance.now();
    const writes = execute();
    const writeMs = performance.now() - startedAt;

    await waitForVisualSettle();

    const totalMs = performance.now() - startedAt;
    const visualMs = Math.max(0, totalMs - writeMs);

    Object.assign(
      model.metrics,
      updateMetrics(
        model.metrics,
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
      batch(() => {
        for (let index = 0; index < model.rows.length; index += 1) {
          model.mutateRowAtIndex(index);
        }
      });
      return model.rows.length * SWEEP_FIELDS_PER_ROW;
    });
  };

  const runWriteStorm = async (): Promise<void> => {
    await runMeasured("Write storm", "batched", () => {
      batch(() => {
        for (let index = 0; index < STORM_WRITES; index += 1) {
          const rowIndex = index % model.rows.length;
          model.stormRowAtIndex(rowIndex);
        }
      });
      return STORM_WRITES * 3;
    });
  };

  const runFirstRowChange = async (): Promise<void> => {
    await runMeasured("First-row change", "single", () => {
      if (model.rows.length === 0) {
        return 0;
      }

      model.mutateRowAtIndex(0);
      return SWEEP_FIELDS_PER_ROW;
    });
  };

  const hoverRow = (rowId: number): void => {
    if (rowId === model.focusedRowId.value) {
      return;
    }

    void runMeasured("Focus shift", "batched", () => {
      batch(() => {
        model.focusRow(rowId);
      });
      return 3;
    });
  };

  return (
    <main class="page">
      <section class="hero">
        <div class="hero__top">
          <div>
            <div class="brand-mark">
              <span class="brand-mark__dot"></span>
              <span>Solid sample / one app shell</span>
            </div>
            <h1>
              One SPA shell for interactive use and repeatable workload runs.
            </h1>
            <p>
              This sample keeps the same market-board shape and controls,
              renders the same real UI for interactive use and workload runs,
              and routes row updates through Solid's store graph and path-level
              writes.
            </p>
          </div>

          <div class="hero__meta">
            <div class="pill">
              <span>Mounted rows</span>
              <strong>{formatInteger(mountedRowCount)}</strong>
            </div>
            <div class="pill">
              <span>Update model</span>
              <strong>Solid path writes</strong>
            </div>
            <div class="pill">
              <span>Focused row</span>
              <strong>{formatInteger(model.focusedRowId.value + 1)}</strong>
            </div>
          </div>
        </div>

        <div class="hero__bottom">
          <BenchmarkControls
            rowCount={model.rows.length}
            onRunBatchedSweep={runBatchedSweep}
            onRunWriteStorm={runWriteStorm}
            onRunFirstRowChange={runFirstRowChange}
          />
          <MetricsGrid metrics={model.metrics} />
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
          onHoverRow={hoverRow}
        />
      </section>
    </main>
  );
}
