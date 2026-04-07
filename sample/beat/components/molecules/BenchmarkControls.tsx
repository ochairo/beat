/** @jsxImportSource @ochairo/beat */
import { component } from "@ochairo/beat";
import { ActionButton } from "../atoms/ActionButton.js";
import { formatInteger } from "../../lib/format.js";

interface BenchmarkControlsProps {
  readonly rowCount: number;
  readonly sweepFieldsPerRow: number;
  readonly stormWrites: number;
  readonly onRunBatchedSweep: () => void | Promise<void>;
  readonly onRunWriteStorm: () => void | Promise<void>;
  readonly onRunUnbatchedSweep: () => void | Promise<void>;
  readonly onFocusNextRow: () => void | Promise<void>;
}

export const BenchmarkControls = component<BenchmarkControlsProps>((props) => {
  return (
    <div class="controls">
      <ActionButton
        label="Run batched sweep"
        hint={`Touch ${formatInteger(props.rowCount)} rows and ${formatInteger(props.rowCount * props.sweepFieldsPerRow)} leaf writes in one flush.`}
        onClick={props.onRunBatchedSweep}
      />
      <ActionButton
        label="Run write storm"
        hint={`${formatInteger(props.stormWrites * 3)} hot-path writes across price, change, and heat.`}
        onClick={props.onRunWriteStorm}
      />
      <ActionButton
        label="Run unbatched sweep"
        hint="Same workload, but notify on every write so the difference is obvious."
        onClick={props.onRunUnbatchedSweep}
      />
      <ActionButton
        label="Shift focused row"
        hint="Move the highlight bar with only a few path-level updates."
        onClick={props.onFocusNextRow}
      />
    </div>
  );
});
