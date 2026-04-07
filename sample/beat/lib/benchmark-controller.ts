import { STORM_WRITES, SWEEP_FIELDS_PER_ROW } from "../config.js";
import { mutateRow, stormRow, type collectMarketRowPulses } from "./market.js";
import { updateMetrics, waitForVisualSettle } from "./metrics.js";
import type { DemoState, Mode, RootPulse } from "../types.js";

export interface BenchmarkController {
  readonly runBatchedSweep: () => Promise<void>;
  readonly runWriteStorm: () => Promise<void>;
  readonly runUnbatchedSweep: () => Promise<void>;
  readonly focusNextRow: () => Promise<void>;
}

interface BenchmarkControllerOptions {
  readonly rowNodes: ReturnType<typeof collectMarketRowPulses>;
  readonly state: RootPulse<DemoState>;
}

export function createBenchmarkController(
  options: BenchmarkControllerOptions,
): BenchmarkController {
  const { rowNodes, state } = options;

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
      await runMeasured("Beat sweep", "batched", () => {
        state.batch(() => {
          for (const row of rowNodes) {
            mutateRow(row);
          }
        });

        return rowNodes.length * SWEEP_FIELDS_PER_ROW;
      });
    },

    runWriteStorm: async (): Promise<void> => {
      await runMeasured("Beat write storm", "batched", () => {
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

    runUnbatchedSweep: async (): Promise<void> => {
      const limit = Math.min(rowNodes.length, 300);
      await runMeasured("Beat unbatched subset", "unbatched", () => {
        for (let index = 0; index < limit; index += 1) {
          const row = rowNodes[index];
          if (!row) {
            continue;
          }

          mutateRow(row);
        }

        return limit * SWEEP_FIELDS_PER_ROW;
      });
    },

    focusNextRow: async (): Promise<void> => {
      await runMeasured("Beat focus shift", "batched", () => {
        const nextId = (state.focusedRowId.get() + 1) % rowNodes.length;
        const previousRow = rowNodes[state.focusedRowId.get()];
        const nextRow = rowNodes[nextId];

        if (!previousRow || !nextRow) {
          return 0;
        }

        state.batch(() => {
          previousRow.set({
            ...previousRow.get(),
            focused: false,
          });
          nextRow.set({
            ...nextRow.get(),
            focused: true,
          });
          state.focusedRowId.set(nextId);
        });

        return 3;
      });
    },
  };
}
