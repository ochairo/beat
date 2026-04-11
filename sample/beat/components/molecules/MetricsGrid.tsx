/** @jsxImportSource @ochairo/beat */
import { bindText, component } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import { formatInteger } from "../../lib/format.js";
import type { DemoMetrics } from "../../types.js";
import { MetricCard } from "../atoms/MetricCard.js";

interface MetricsGridProps {
  readonly metrics: Pulse<DemoMetrics>;
}

export const MetricsGrid = component<MetricsGridProps>((props) => {
  return (
    <div class="metrics">
      <MetricCard
        label="Last write burst"
        value={bindText(
          props.metrics.lastDurationMs,
          (value) => `${value.toFixed(2)} ms`,
        )}
        detail="Synchronous JS write time"
      />
      <MetricCard
        label="Average total burst"
        value={bindText(
          props.metrics.averageTotalMs,
          (value) => `${value.toFixed(2)} ms`,
        )}
        detail="Rolling average of full interaction time"
      />
      <MetricCard
        label="Last visual settle"
        value={bindText(
          props.metrics.lastVisualMs,
          (value) => `${value.toFixed(2)} ms`,
        )}
        detail="Time spent waiting for the UI to visibly settle"
      />
      <MetricCard
        label="Last total burst"
        value={bindText(
          props.metrics.lastTotalMs,
          (value) => `${value.toFixed(2)} ms`,
        )}
        detail="Write time plus visual settle time"
      />
      <MetricCard
        label="Best total burst"
        value={bindText(
          props.metrics.bestTotalMs,
          (value) => `${value.toFixed(2)} ms`,
        )}
        detail="Fastest full interaction measured so far"
      />
      <MetricCard
        label="Leaf writes"
        value={bindText(props.metrics.totalWrites, formatInteger)}
        detail="Total Pulse path writes so far"
      />
      <MetricCard
        label="Operations"
        value={bindText(props.metrics.operationsRun, formatInteger)}
        detail="How many demo runs completed"
      />
    </div>
  );
});
