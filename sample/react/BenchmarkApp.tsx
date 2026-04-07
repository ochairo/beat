import { useMemo } from "react";
import { flushSync } from "react-dom";
import { STORM_WRITES, SURFACE_MODE, SWEEP_FIELDS_PER_ROW } from "./config.js";
import { createMarketStore, useMetrics } from "./lib/market-store.js";
import { updateMetrics, waitForVisualSettle } from "./lib/metrics.js";
import { BenchmarkControls } from "./components/molecules/BenchmarkControls.js";
import { MetricsGrid } from "./components/molecules/MetricsGrid.js";
import { MarketSurface } from "./components/organisms/MarketSurface.js";
import type { MarketRow, Mode } from "./types.js";

interface BenchmarkAppProps {
  readonly initialRows: readonly MarketRow[];
}

export function BenchmarkApp(props: BenchmarkAppProps): JSX.Element {
  const store = useMemo(
    () => createMarketStore(props.initialRows),
    [props.initialRows],
  );
  const metrics = useMetrics(store);
  const rowIds = store.rowIds;

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
    await runMeasured("React sweep", "batched", () => {
      store.batch(() => {
        for (const rowId of rowIds) {
          store.mutateRow(rowId);
        }
      });
      return rowIds.length * SWEEP_FIELDS_PER_ROW;
    });
  };

  const runWriteStorm = async (): Promise<void> => {
    await runMeasured("React write storm", "batched", () => {
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

  const runUnbatchedSweep = async (): Promise<void> => {
    const limit = Math.min(rowIds.length, 300);
    await runMeasured("React unbatched subset", "unbatched", () => {
      for (let index = 0; index < limit; index += 1) {
        const rowId = rowIds[index];
        if (rowId === undefined) {
          continue;
        }

        store.mutateRow(rowId);
      }
      return limit * SWEEP_FIELDS_PER_ROW;
    });
  };

  const focusNextRow = async (): Promise<void> => {
    await runMeasured("React focus shift", "batched", () => {
      store.batch(() => {
        store.moveFocus();
      });
      return 3;
    });
  };

  return (
    <main className="page">
      <section className="panel panel--bench">
        <BenchmarkControls
          rowCount={rowIds.length}
          onRunBatchedSweep={runBatchedSweep}
          onRunWriteStorm={runWriteStorm}
          onRunUnbatchedSweep={runUnbatchedSweep}
          onFocusNextRow={focusNextRow}
        />
        <MetricsGrid benchmarkMode={true} metrics={metrics} />
        <MarketSurface
          rowIds={rowIds}
          store={store}
          surfaceMode={SURFACE_MODE}
        />
      </section>
    </main>
  );
}
