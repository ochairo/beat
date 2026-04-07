import type { DemoMetrics } from "../../types.js";

interface ExecutionFeedProps {
  readonly metrics: DemoMetrics;
}

export function ExecutionFeed(props: ExecutionFeedProps): JSX.Element {
  return (
    <section class="panel">
      <div class="panel__title">
        <h3>Execution feed</h3>
        <span class="panel__subtitle">
          Measured with path-level Solid writes
        </span>
      </div>
      <div class="status-line">
        <div class="status-chip">
          <span>Last run</span>
          <strong>{props.metrics.status}</strong>
        </div>
        <div class="status-chip">
          <span>Mode</span>
          <strong>{props.metrics.lastMode}</strong>
        </div>
      </div>
      <p class="footnote">
        This page deliberately uses Solid's store graph so the board update cost
        reflects path-level invalidation rather than an array-wide signal
        replacement.
      </p>
    </section>
  );
}
