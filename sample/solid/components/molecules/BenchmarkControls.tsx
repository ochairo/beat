import { STORM_WRITES } from "../../config.js";
import { formatInteger } from "../../lib/format.js";
import { ActionButton } from "../atoms/ActionButton.js";

interface BenchmarkControlsProps {
  readonly rowCount: number;
  readonly onRunBatchedSweep: () => void | Promise<void>;
  readonly onRunWriteStorm: () => void | Promise<void>;
  readonly onRunUnbatchedSweep: () => void | Promise<void>;
  readonly onFocusNextRow: () => void | Promise<void>;
}

export function BenchmarkControls(props: BenchmarkControlsProps): JSX.Element {
  return (
    <div class="controls">
      <ActionButton
        label="Run batched sweep"
        hint={`Touch ${formatInteger(props.rowCount)} rows through path-level Solid store writes.`}
        onClick={props.onRunBatchedSweep}
      />
      <ActionButton
        label="Run write storm"
        hint={`${formatInteger(STORM_WRITES * 3)} row-field writes delivered through path-level Solid store writes.`}
        onClick={props.onRunWriteStorm}
      />
      <ActionButton
        label="Run unbatched sweep"
        hint="Commits a smaller subset row by row so the extra invalidation cost is visible."
        onClick={props.onRunUnbatchedSweep}
      />
      <ActionButton
        label="Shift focused row"
        hint="Moves the focus highlight by updating only the affected row paths."
        onClick={props.onFocusNextRow}
      />
    </div>
  );
}
