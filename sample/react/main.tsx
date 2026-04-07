import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { ROW_COUNT } from "./config.js";
import { fetchMarketRows } from "./lib/market-store.js";

const rootElement = document.querySelector("#app");
if (!(rootElement instanceof HTMLElement)) {
  throw new Error("Missing #app mount target");
}

const appRootElement = rootElement;
const root = createRoot(appRootElement);

function renderApp(
  initialRows: Awaited<ReturnType<typeof fetchMarketRows>>,
): void {
  root.render(<App initialRows={initialRows} />);
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
