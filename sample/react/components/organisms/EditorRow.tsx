import { memo } from "react";
import { formatInteger, formatPercent } from "../../lib/format.js";
import { useRow } from "../../lib/market-store.js";
import type { MarketStore } from "../../types.js";

interface EditorRowProps {
  readonly store: MarketStore;
  readonly rowId: number;
}

export const EditorRow = memo(function EditorRow(
  props: EditorRowProps,
): JSX.Element {
  const row = useRow(props.store, props.rowId);

  return (
    <article
      className={`market-editor ${row.focused ? "is-focused" : ""} ${row.change >= 0 ? "is-up" : "is-down"}`.trim()}
    >
      <div className="market-editor__header">
        <div>
          <strong>{row.symbol}</strong>
          <span>{row.venue}</span>
        </div>
        <span className="market-editor__id">
          #{row.id.toString().padStart(3, "0")}
        </span>
      </div>
      <div className="editor-fields">
        <label className="editor-field">
          <span>Price</span>
          <input
            className="editor-input"
            readOnly
            value={row.price.toFixed(2)}
          />
        </label>
        <label className="editor-field">
          <span>Change</span>
          <input
            className="editor-input"
            readOnly
            value={formatPercent(row.change)}
          />
        </label>
        <label className="editor-field">
          <span>Volume</span>
          <input
            className="editor-input"
            readOnly
            value={formatInteger(row.volume)}
          />
        </label>
        <label className="editor-field">
          <span>Trades</span>
          <input
            className="editor-input"
            readOnly
            value={formatInteger(row.trades)}
          />
        </label>
      </div>
      <div className="editor-controls">
        <label className="editor-slider">
          <span>Heat</span>
          <input type="range" min={0} max={100} value={row.heat} disabled />
        </label>
        <label className="editor-toggle">
          <span>Focused</span>
          <input
            className="editor-checkbox"
            type="checkbox"
            checked={row.focused}
            readOnly
            disabled
          />
        </label>
      </div>
    </article>
  );
});
