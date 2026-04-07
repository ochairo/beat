import { batch } from "solid-js";
import { STORM_WRITES, SURFACE_MODE, SWEEP_FIELDS_PER_ROW } from "./config.js";
import { createMarketModel } from "./lib/market-store.js";
import { updateMetrics, waitForVisualSettle } from "./lib/metrics.js";
import { BenchmarkControls } from "./components/molecules/BenchmarkControls.js";
import { MetricsGrid } from "./components/molecules/MetricsGrid.js";
import { MarketSurface } from "./components/organisms/MarketSurface.js";
import type { MarketRow, Mode } from "./types.js";

interface BenchmarkAppProps {
  readonly initialRows: readonly MarketRow[];
}

export function BenchmarkApp(props: BenchmarkAppProps): JSX.Element {
  const model = createMarketModel(props.initialRows);

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
    await runMeasured("Solid sweep", "batched", () => {
      batch(() => {
        for (let index = 0; index < model.rows.length; index += 1) {
          model.mutateRowAtIndex(index);
        }
      });
      return model.rows.length * SWEEP_FIELDS_PER_ROW;
    });
  };

  const runWriteStorm = async (): Promise<void> => {
    await runMeasured("Solid write storm", "batched", () => {
      batch(() => {
        for (let index = 0; index < STORM_WRITES; index += 1) {
          const rowIndex = index % model.rows.length;
          model.stormRowAtIndex(rowIndex);
        }
      });
      return STORM_WRITES * 3;
    });
  };

  const runUnbatchedSweep = async (): Promise<void> => {
    const limit = Math.min(model.rows.length, 300);
    await runMeasured("Solid unbatched subset", "unbatched", () => {
      for (let index = 0; index < limit; index += 1) {
        model.mutateRowAtIndex(index);
      }
      return limit * SWEEP_FIELDS_PER_ROW;
    });
  };

  const focusNextRow = async (): Promise<void> => {
    await runMeasured("Solid focus shift", "batched", () => {
      batch(() => {
        model.focusNextRow();
      });
      return 3;
    });
  };

  return (
    <main class="page">
      <section class="panel panel--bench">
        <BenchmarkControls
          rowCount={model.rows.length}
          onRunBatchedSweep={runBatchedSweep}
          onRunWriteStorm={runWriteStorm}
          onRunUnbatchedSweep={runUnbatchedSweep}
          onFocusNextRow={focusNextRow}
        />
        <MetricsGrid benchmarkMode={true} metrics={model.metrics} />
        <MarketSurface rows={model.rows} surfaceMode={SURFACE_MODE} />
      </section>
    </main>
  );
}