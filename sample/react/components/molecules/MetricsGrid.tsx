import type { JSX } from "react";
import { formatFixedMs, formatInteger } from "../../lib/format.js";
import type { DemoMetrics } from "../../types.js";
import { MetricCard } from "../atoms/MetricCard.js";

interface MetricsGridProps {
  readonly metrics: DemoMetrics;
}

export function MetricsGrid(props: MetricsGridProps): JSX.Element {
  return (
    <div className="metrics">
      <MetricCard
        label="Last write burst"
        value={formatFixedMs(props.metrics.lastDurationMs)}
        detail="React subscription plus commit time"
      />
      <MetricCard
        label="Average total burst"
        value={formatFixedMs(props.metrics.averageTotalMs)}
        detail="Rolling average of full interaction time"
      />
      <MetricCard
        label="Last visual settle"
        value={formatFixedMs(props.metrics.lastVisualMs)}
        detail="Time spent waiting for the UI to visibly settle"
      />
      <MetricCard
        label="Last total burst"
        value={formatFixedMs(props.metrics.lastTotalMs)}
        detail="Write time plus visual settle time"
      />
      <MetricCard
        label="Best total burst"
        value={formatFixedMs(props.metrics.bestTotalMs)}
        detail="Fastest full interaction measured so far"
      />
      <MetricCard
        label="Leaf writes"
        value={formatInteger(props.metrics.totalWrites)}
        detail="Logical field writes applied"
      />
      <MetricCard
        label="Operations"
        value={formatInteger(props.metrics.operationsRun)}
        detail="Completed demo runs"
      />
    </div>
  );
}
