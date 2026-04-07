import type { DemoMetrics } from "../../types.js";

interface ExecutionFeedProps {
  readonly metrics: DemoMetrics;
}

export function ExecutionFeed(props: ExecutionFeedProps): JSX.Element {
  return (
    <section className="panel">
      <div className="panel__title">
        <h3>Execution feed</h3>
        <span className="panel__subtitle">
          Measured with subscribed React rows
        </span>
      </div>
      <div className="status-line">
        <div className="status-chip">
          <span>Last run</span>
          <strong>{props.metrics.status}</strong>
        </div>
        <div className="status-chip">
          <span>Mode</span>
          <strong>{props.metrics.lastMode}</strong>
        </div>
      </div>
      <p className="footnote">
        This page deliberately uses plain React with useSyncExternalStore so the
        board update cost reflects a row-subscribed React implementation rather
        than whole-tree state.
      </p>
    </section>
  );
}
