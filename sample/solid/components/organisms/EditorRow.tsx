import { formatInteger, formatPercent } from "../../lib/format.js";
import type { MarketRow } from "../../types.js";

interface EditorRowProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly row: () => MarketRow;
}

export function EditorRow(props: EditorRowProps): JSX.Element {
  return (
    <article
      class="market-editor"
      classList={{
        "is-focused": props.row().focused,
        "is-up": props.row().change >= 0,
        "is-down": props.row().change < 0,
      }}
      onMouseEnter={() => {
        props.onHoverRow?.(props.row().id);
      }}
    >
      <div class="market-editor__header">
        <div>
          <strong>{props.row().symbol}</strong>
          <span>{props.row().venue}</span>
        </div>
        <span class="market-editor__id">
          #{props.row().id.toString().padStart(3, "0")}
        </span>
      </div>
      <div class="editor-fields">
        <label class="editor-field">
          <span>Price</span>
          <input
            class="editor-input"
            readOnly
            value={props.row().price.toFixed(2)}
          />
        </label>
        <label class="editor-field">
          <span>Change</span>
          <input
            class="editor-input"
            readOnly
            value={formatPercent(props.row().change)}
          />
        </label>
        <label class="editor-field">
          <span>Volume</span>
          <input
            class="editor-input"
            readOnly
            value={formatInteger(props.row().volume)}
          />
        </label>
        <label class="editor-field">
          <span>Trades</span>
          <input
            class="editor-input"
            readOnly
            value={formatInteger(props.row().trades)}
          />
        </label>
      </div>
      <div class="editor-controls">
        <label class="editor-slider">
          <span>Heat</span>
          <input
            type="range"
            min={0}
            max={100}
            value={props.row().heat}
            disabled
          />
        </label>
        <label class="editor-toggle">
          <span>Focused</span>
          <input
            class="editor-checkbox"
            type="checkbox"
            checked={props.row().focused}
            readOnly
            disabled
          />
        </label>
      </div>
    </article>
  );
}
