/** @jsxImportSource @ochairo/beat */
import { bindText, component } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { DemoMetrics } from "../../types.js";

interface ExecutionFeedProps {
  readonly metrics: Pulse<DemoMetrics>;
}

export const ExecutionFeed = component<ExecutionFeedProps>((props) => {
  return (
    <section class="panel">
      <div class="panel__title">
        <h3>Execution feed</h3>
        <span class="panel__subtitle">
          JS-side timings, not a synthetic benchmark harness
        </span>
      </div>

      <div class="status-line">
        <div class="status-chip">
          <span>Last run</span>
          <strong>{bindText(props.metrics.status)}</strong>
        </div>
        <div class="status-chip">
          <span>Mode</span>
          <strong>{bindText(props.metrics.lastMode)}</strong>
        </div>
      </div>

      <p class="footnote">
        This sample keeps the DOM static after mount and lets Pulse update only
        the touched values, widths, and classes.
      </p>
    </section>
  );
});