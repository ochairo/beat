import { memo, type JSX } from "react";
import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";
import { useRow } from "../../lib/market-store.js";
import type { MarketStore } from "../../types.js";

interface TableRowProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly store: MarketStore;
  readonly rowId: number;
}

export const TableRow = memo(function TableRow(
  props: TableRowProps,
): JSX.Element {
  const row = useRow(props.store, props.rowId);

  return (
    <article
      className={`order-book__row ${row.focused ? "is-focused" : ""} ${row.change >= 0 ? "is-up" : "is-down"}`.trim()}
      onMouseEnter={() => {
        props.onHoverRow?.(props.rowId);
      }}
    >
      <div className="row-symbol">
        <strong>{row.symbol}</strong>
        <span>#{row.id.toString().padStart(3, "0")}</span>
      </div>
      <div className="row-venue">{row.venue}</div>
      <div className="row-price">{formatCurrency(row.price)}</div>
      <div className="row-change">{formatPercent(row.change)}</div>
      <div className="row-volume">{formatInteger(row.volume)}</div>
      <div className="row-trades">{formatInteger(row.trades)}</div>
      <div className="row-heat">
        <div className="row-heatbar">
          <div
            className="row-heatbar__fill"
            style={{ width: `${row.heat}%` }}
          ></div>
        </div>
      </div>
    </article>
  );
});
