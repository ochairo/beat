import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";
import type { MarketRow } from "../../types.js";

interface CardRowProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly row: () => MarketRow;
}

export function CardRow(props: CardRowProps): JSX.Element {
  return (
    <article
      class="market-card"
      classList={{
        "is-focused": props.row().focused,
        "is-up": props.row().change >= 0,
        "is-down": props.row().change < 0,
      }}
      onMouseEnter={() => {
        props.onHoverRow?.(props.row().id);
      }}
    >
      <div class="market-card__header">
        <div>
          <strong>{props.row().symbol}</strong>
          <span>{props.row().venue}</span>
        </div>
        <span class="market-card__id">
          #{props.row().id.toString().padStart(3, "0")}
        </span>
      </div>
      <div class="market-card__price">{formatCurrency(props.row().price)}</div>
      <div class="market-card__meta">
        <div class="market-card__stat">
          <span>Change</span>
          <strong>{formatPercent(props.row().change)}</strong>
        </div>
        <div class="market-card__stat">
          <span>Volume</span>
          <strong>{formatInteger(props.row().volume)}</strong>
        </div>
        <div class="market-card__stat">
          <span>Trades</span>
          <strong>{formatInteger(props.row().trades)}</strong>
        </div>
      </div>
      <div class="market-card__heat">
        <span>Heat</span>
        <div class="row-heatbar">
          <div
            class="row-heatbar__fill"
            style={{ width: `${props.row().heat}%` }}
          ></div>
        </div>
      </div>
    </article>
  );
}
