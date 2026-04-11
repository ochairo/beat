import type { JSX } from "react";
import { STORM_WRITES, SWEEP_FIELDS_PER_ROW } from "../../config.js";
import { formatInteger } from "../../lib/format.js";
import { ActionButton } from "../atoms/ActionButton.js";

interface BenchmarkControlsProps {
  readonly rowCount: number;
  readonly onRunBatchedSweep: () => void | Promise<void>;
  readonly onRunWriteStorm: () => void | Promise<void>;
  readonly onRunFirstRowChange: () => void | Promise<void>;
}

export function BenchmarkControls(props: BenchmarkControlsProps): JSX.Element {
  return (
    <div className="controls">
      <ActionButton
        label="Run batched sweep"
        hint={`Touch ${formatInteger(props.rowCount)} rows and ${formatInteger(props.rowCount * SWEEP_FIELDS_PER_ROW)} leaf writes in one flush.`}
        onClick={props.onRunBatchedSweep}
      />
      <ActionButton
        label="Run write storm"
        hint={`Touch ${formatInteger(STORM_WRITES)} rows and ${formatInteger(STORM_WRITES * 3)} leaf writes across price, change, and heat.`}
        onClick={props.onRunWriteStorm}
      />
      <ActionButton
        label="Run first-row change"
        hint={`Touch 1 row and ${formatInteger(SWEEP_FIELDS_PER_ROW)} leaf writes on the first mounted row.`}
        onClick={props.onRunFirstRowChange}
      />
    </div>
  );
}
