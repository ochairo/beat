import { render } from "solid-js/web";
import { App } from "./App.js";
import { ROW_COUNT } from "./config.js";
import { fetchMarketRows } from "./lib/market-store.js";

const rootElement = document.querySelector("#app");
if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Missing #app mount target");
}

const appRootElement = rootElement;
let disposeApp = (): void => {};

function renderApp(
  initialRows: Awaited<ReturnType<typeof fetchMarketRows>>,
): void {
  disposeApp();
  disposeApp = render(() => <App initialRows={initialRows} />, appRootElement);
}

async function bootstrap(): Promise<void> {
  const initialRows = await fetchMarketRows(ROW_COUNT);
  renderApp(initialRows);
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  appRootElement.textContent =
    error instanceof Error ? error.message : "Failed to load sample data.";
});
