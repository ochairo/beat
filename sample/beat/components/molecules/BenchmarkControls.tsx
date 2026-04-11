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
  readonly onRunFirstRowChange: () => void | Promise<void>;
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
        hint={`Touch ${formatInteger(props.stormWrites)} rows and ${formatInteger(props.stormWrites * 3)} leaf writes across price, change, and heat.`}
        onClick={props.onRunWriteStorm}
      />
      <ActionButton
        label="Run first-row change"
        hint={`Touch 1 row and ${formatInteger(props.sweepFieldsPerRow)} leaf writes on the first mounted row.`}
        onClick={props.onRunFirstRowChange}
      />
    </div>
  );
});
