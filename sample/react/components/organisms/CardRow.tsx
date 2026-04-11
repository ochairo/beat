import { memo, type JSX } from "react";
import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";
import { useRow } from "../../lib/market-store.js";
import type { MarketStore } from "../../types.js";

interface CardRowProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly store: MarketStore;
  readonly rowId: number;
}

export const CardRow = memo(function CardRow(props: CardRowProps): JSX.Element {
  const row = useRow(props.store, props.rowId);

  return (
    <article
      className={`market-card ${row.focused ? "is-focused" : ""} ${row.change >= 0 ? "is-up" : "is-down"}`.trim()}
      onMouseEnter={() => {
        props.onHoverRow?.(props.rowId);
      }}
    >
      <div className="market-card__header">
        <div>
          <strong>{row.symbol}</strong>
          <span>{row.venue}</span>
        </div>
        <span className="market-card__id">
          #{row.id.toString().padStart(3, "0")}
        </span>
      </div>
      <div className="market-card__price">{formatCurrency(row.price)}</div>
      <div className="market-card__meta">
        <div className="market-card__stat">
          <span>Change</span>
          <strong>{formatPercent(row.change)}</strong>
        </div>
        <div className="market-card__stat">
          <span>Volume</span>
          <strong>{formatInteger(row.volume)}</strong>
        </div>
        <div className="market-card__stat">
          <span>Trades</span>
          <strong>{formatInteger(row.trades)}</strong>
        </div>
      </div>
      <div className="market-card__heat">
        <span>Heat</span>
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
