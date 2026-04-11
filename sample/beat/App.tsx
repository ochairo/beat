/** @jsxImportSource @ochairo/beat */
import { bindText, component } from "@ochairo/beat";
import { STORM_WRITES, SURFACE_MODE, SWEEP_FIELDS_PER_ROW } from "./config.js";
import { BenchmarkControls } from "./components/molecules/BenchmarkControls.js";
import { MetricsGrid } from "./components/molecules/MetricsGrid.js";
import { formatInteger } from "./lib/format.js";
import type { DemoState, RootPulse } from "./types.js";
import { MarketSurface } from "./components/organisms/MarketSurface.js";
import { createBenchmarkController } from "./lib/benchmark-controller.js";
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
  const controller = createBenchmarkController(props);

  return (
    <main class="page">
      <section class="hero">
        <div class="hero__top">
          <div>
            <div class="brand-mark">
              <span class="brand-mark__dot" />
              <span>Beat sample / one app shell</span>
            </div>
            <h1>
              One SPA shell for interactive use and repeatable workload runs.
            </h1>
            <p>
              {`This sample mounts through Beat's public JSX and root APIs, renders ${formatInteger(mountedRowCount)} market rows from the sample backend, and exposes the same real UI for normal interaction and benchmark runs.`}
            </p>
          </div>

          <div class="hero__meta">
            <div class="pill">
              <span>Mounted rows</span>
              <strong>{formatInteger(mountedRowCount)}</strong>
            </div>
            <div class="pill">
              <span>Update model</span>
              <strong>Pulse row writes</strong>
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

        <div class="hero__bottom">
          <BenchmarkControls
            rowCount={rowNodes.length}
            sweepFieldsPerRow={SWEEP_FIELDS_PER_ROW}
            stormWrites={STORM_WRITES}
            onRunBatchedSweep={controller.runBatchedSweep}
            onRunWriteStorm={controller.runWriteStorm}
            onRunFirstRowChange={controller.runFirstRowChange}
          />
          <MetricsGrid metrics={state.metrics} />
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
          onHoverRow={controller.hoverRow}
        />
      </section>
    </main>
  );
});
