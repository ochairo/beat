import { STORM_WRITES, SWEEP_FIELDS_PER_ROW } from "../config.js";
import {
  mutateRow,
  setMarketRowFocused,
  stormRow,
  type collectMarketRowPulses,
} from "./market.js";
import { updateMetrics, waitForVisualSettle } from "./metrics.js";
import type { DemoState, Mode, RootPulse } from "../types.js";

export interface BenchmarkController {
  readonly runBatchedSweep: () => Promise<void>;
  readonly runWriteStorm: () => Promise<void>;
  readonly runFirstRowChange: () => Promise<void>;
  readonly hoverRow: (rowId: number) => void;
}

interface BenchmarkControllerOptions {
  readonly rowNodes: ReturnType<typeof collectMarketRowPulses>;
  readonly state: RootPulse<DemoState>;
}

export function createBenchmarkController(
  options: BenchmarkControllerOptions,
): BenchmarkController {
  const { rowNodes, state } = options;
  let focusRunInFlight = false;

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

    state.metrics.set(
      updateMetrics(
        state.metrics.get(),
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

  return {
    runBatchedSweep: async (): Promise<void> => {
      await runMeasured("Batched sweep", "batched", () => {
        state.batch(() => {
          for (const row of rowNodes) {
            mutateRow(row);
          }
        });

        return rowNodes.length * SWEEP_FIELDS_PER_ROW;
      });
    },

    runWriteStorm: async (): Promise<void> => {
      await runMeasured("Write storm", "batched", () => {
        state.batch(() => {
          for (let index = 0; index < STORM_WRITES; index += 1) {
            const row = rowNodes[index % rowNodes.length];
            if (!row) {
              continue;
            }

            stormRow(row);
          }
        });

        return STORM_WRITES * 3;
      });
    },

    runFirstRowChange: async (): Promise<void> => {
      await runMeasured("First-row change", "single", () => {
        const row = rowNodes[0];
        if (!row) {
          return 0;
        }

        mutateRow(row);
        return SWEEP_FIELDS_PER_ROW;
      });
    },

    hoverRow: (rowId: number): void => {
      const previousId = state.focusedRowId.get();
      if (rowId === previousId || focusRunInFlight) {
        return;
      }

      const previousRow = rowNodes[previousId];
      const nextRow = rowNodes[rowId];

      if (!previousRow || !nextRow) {
        return;
      }

      focusRunInFlight = true;

      void runMeasured("Focus shift", "batched", () => {
        state.batch(() => {
          setMarketRowFocused(previousRow, false);
          setMarketRowFocused(nextRow, true);
          state.focusedRowId.set(rowId);
        });

        return 3;
      }).finally(() => {
        focusRunInFlight = false;
      });
    },
  };
}
