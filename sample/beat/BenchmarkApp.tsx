/** @jsxImportSource @ochairo/beat */
import { component } from "@ochairo/beat";
import { STORM_WRITES, SURFACE_MODE, SWEEP_FIELDS_PER_ROW } from "./config.js";
import { BenchmarkControls } from "./components/molecules/BenchmarkControls.js";
import { MetricsGrid } from "./components/molecules/MetricsGrid.js";
import { MarketSurface } from "./components/organisms/MarketSurface.js";
import { createBenchmarkController } from "./lib/benchmark-controller.js";
import { collectMarketRowPulses } from "./lib/market.js";
import type { DemoState, RootPulse } from "./types.js";

interface BenchmarkAppProps {
  readonly rowNodes: ReturnType<typeof collectMarketRowPulses>;
  readonly state: RootPulse<DemoState>;
}

export const BenchmarkApp = component<BenchmarkAppProps>((props) => {
  const controller = createBenchmarkController(props);

  return (
    <main class="page">
      <section class="panel panel--bench">
        <BenchmarkControls
          rowCount={props.rowNodes.length}
          sweepFieldsPerRow={SWEEP_FIELDS_PER_ROW}
          stormWrites={STORM_WRITES}
          onRunBatchedSweep={controller.runBatchedSweep}
          onRunWriteStorm={controller.runWriteStorm}
          onRunUnbatchedSweep={controller.runUnbatchedSweep}
          onFocusNextRow={controller.focusNextRow}
        />
        <MetricsGrid metrics={props.state.metrics} benchmarkMode={true} />
        <MarketSurface rows={props.state.rows} surfaceMode={SURFACE_MODE} />
      </section>
    </main>
  );
});
