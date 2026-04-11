/** @jsxImportSource @ochairo/beat */
import { createRoot } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";
import { App } from "./App";
import { ROW_COUNT } from "./config.js";
import { collectMarketRowPulses, fetchMarketRows } from "./lib/market.js";
import { createInitialMetrics } from "./lib/metrics.js";
import type { DemoState, RootPulse } from "./types.js";

const mountTarget = document.querySelector("#app");

if (!(mountTarget instanceof HTMLElement)) {
  throw new Error("Missing #app mount target");
}

const appTarget = mountTarget;
const root = createRoot(appTarget);

function createAppState(rows: Awaited<ReturnType<typeof fetchMarketRows>>): {
  readonly rowNodes: ReturnType<typeof collectMarketRowPulses>;
  readonly state: RootPulse<DemoState>;
} {
  const state = pulse<DemoState>({
    metrics: createInitialMetrics(
      "Ready. This sample uses the same app shell for interactive use and repeatable workload runs.",
    ),
    rows,
    focusedRowId: 0,
  }) as RootPulse<DemoState>;

  return {
    state,
    rowNodes: collectMarketRowPulses(state.rows),
  };
}

function renderApp(rows: Awaited<ReturnType<typeof fetchMarketRows>>): void {
  const { state, rowNodes } = createAppState(rows);
  root.render(<App state={state} rowNodes={rowNodes} />);
}

async function bootstrap(): Promise<void> {
  const rows = await fetchMarketRows(ROW_COUNT);
  renderApp(rows);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  appTarget.textContent =
    error instanceof Error ? error.message : "Failed to load sample data.";
});
