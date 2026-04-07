import type { BenchmarkTiming, DemoMetrics, Mode } from "../types.js";

export function createInitialMetrics(status: string): DemoMetrics {
  return {
    lastDurationMs: 0,
    lastVisualMs: 0,
    lastTotalMs: 0,
    bestTotalMs: 0,
    averageTotalMs: 0,
    totalWrites: 0,
    operationsRun: 0,
    lastMode: "idle",
    status,
  };
}

export function waitForVisualSettle(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

export function updateMetrics(
  previous: DemoMetrics,
  timing: BenchmarkTiming,
  writes: number,
  mode: Mode,
  label: string,
): DemoMetrics {
  const nextRuns = previous.operationsRun + 1;
  const nextAverage =
    previous.operationsRun === 0
      ? timing.totalMs
      : (previous.averageTotalMs * previous.operationsRun + timing.totalMs) /
        nextRuns;

  return {
    lastDurationMs: timing.writeMs,
    lastVisualMs: timing.visualMs,
    lastTotalMs: timing.totalMs,
    bestTotalMs:
      previous.bestTotalMs === 0
        ? timing.totalMs
        : Math.min(previous.bestTotalMs, timing.totalMs),
    averageTotalMs: nextAverage,
    totalWrites: previous.totalWrites + writes,
    operationsRun: nextRuns,
    lastMode: mode,
    status:
      `${label} completed in ${timing.writeMs.toFixed(2)} ms write time, ` +
      `${timing.totalMs.toFixed(2)} ms total time, across ${writes.toLocaleString("en-US")} writes.`,
  };
}
