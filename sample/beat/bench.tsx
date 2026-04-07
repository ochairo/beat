/** @jsxImportSource @ochairo/beat */
import { createRoot } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";
import { BenchmarkApp } from "./BenchmarkApp.js";
import { ROW_COUNT } from "./config.js";
import { collectMarketRowPulses, fetchMarketRows } from "./lib/market.js";
import { createInitialMetrics } from "./lib/metrics.js";
import type { DemoState, RootPulse } from "./types.js";

const rootElement = document.querySelector("#app");
if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Missing #app mount target");
}

const appRootElement = rootElement;

async function bootstrap(): Promise<void> {
  const rows = await fetchMarketRows(ROW_COUNT);
  const state = pulse<DemoState>({
    metrics: createInitialMetrics(
      "Ready. Beat mounts once and updates only the touched DOM bindings.",
    ),
    rows,
    focusedRowId: 0,
  }) as RootPulse<DemoState>;
  const rowNodes = collectMarketRowPulses(state.rows);

  createRoot(appRootElement).render(
    <BenchmarkApp state={state} rowNodes={rowNodes} />,
  );
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  appRootElement.textContent =
    error instanceof Error ? error.message : "Failed to load sample data.";
});
