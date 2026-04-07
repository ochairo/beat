import { render } from "solid-js/web";
import { BenchmarkApp } from "./BenchmarkApp.js";
import { ROW_COUNT } from "./config.js";
import { fetchMarketRows } from "./lib/market-store.js";

const rootElement = document.querySelector("#app");
if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Missing #app mount target");
}

const appRootElement = rootElement;

async function bootstrap(): Promise<void> {
  const initialRows = await fetchMarketRows(ROW_COUNT);
  render(() => <BenchmarkApp initialRows={initialRows} />, appRootElement);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  appRootElement.textContent =
    error instanceof Error ? error.message : "Failed to load sample data.";
});