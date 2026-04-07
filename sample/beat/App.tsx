/** @jsxImportSource @ochairo/beat */
import { bindText, component } from "@ochairo/beat";
import { formatInteger } from "./lib/format.js";
import { SURFACE_MODE } from "./config.js";
import type { DemoState, RootPulse } from "./types.js";
import { MarketSurface } from "./components/organisms/MarketSurface.js";
import { collectMarketRowPulses } from "./lib/market.js";
import { getSurfaceCopy } from "./lib/surface-copy.js";

interface AppProps {
  readonly rowNodes: ReturnType<typeof collectMarketRowPulses>;
  readonly state: RootPulse<DemoState>;
}

export const App = component<AppProps>((props) => {
  const { rowNodes, state } = props;
  const mountedRowCount = rowNodes.length;
  const surfaceCopy = getSurfaceCopy(SURFACE_MODE);

  const focusRow = (rowId: number): void => {
    const previousId = state.focusedRowId.get();
    if (rowId === previousId) {
      return;
    }

    const previousRow = rowNodes[previousId];
    const nextRow = rowNodes[rowId];
    if (!previousRow || !nextRow) {
      return;
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
      state.focusedRowId.set(rowId);
    });
  };

  return (
    <main class="page">
      <section class="hero">
        <div class="hero__top">
          <div>
            <div class="brand-mark">
              <span class="brand-mark__dot" />
              <span>Beat sample / public framework API</span>
            </div>
            <h1>Fine-grained writes without rerendering the whole board.</h1>
            <p>
              {`This page mounts through Beat's public JSX and root APIs, renders ${formatInteger(mountedRowCount)} market rows from the sample backend, and keeps the hot-path row updates on direct DOM bindings.`}
            </p>
          </div>

          <div class="hero__meta">
            <div class="pill">
              <span>Mounted rows</span>
              <strong>{formatInteger(mountedRowCount)}</strong>
            </div>
            <div class="pill">
              <span>Binding strategy</span>
              <strong>Beat public DOM helpers</strong>
            </div>
            <div class="pill">
              <span>Focused row</span>
              <strong>
                {bindText(state.focusedRowId, (value) =>
                  formatInteger(value + 1),
                )}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__title">
          <h2>{surfaceCopy.title}</h2>
          <span class="panel__subtitle">{surfaceCopy.subtitle}</span>
        </div>
        <MarketSurface
          rows={state.rows}
          surfaceMode={SURFACE_MODE}
          onHoverRow={focusRow}
        />
      </section>
    </main>
  );
});
