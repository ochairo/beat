import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";
import type { MarketRow } from "../../types.js";

interface TableRowProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly row: () => MarketRow;
}

export function TableRow(props: TableRowProps): JSX.Element {
  return (
    <article
      class="order-book__row"
      classList={{
        "is-focused": props.row().focused,
        "is-up": props.row().change >= 0,
        "is-down": props.row().change < 0,
      }}
      onMouseEnter={() => {
        props.onHoverRow?.(props.row().id);
      }}
    >
      <div class="row-symbol">
        <strong>{props.row().symbol}</strong>
        <span>#{props.row().id.toString().padStart(3, "0")}</span>
      </div>
      <div class="row-venue">{props.row().venue}</div>
      <div class="row-price">{formatCurrency(props.row().price)}</div>
      <div class="row-change">{formatPercent(props.row().change)}</div>
      <div class="row-volume">{formatInteger(props.row().volume)}</div>
      <div class="row-trades">{formatInteger(props.row().trades)}</div>
      <div class="row-heat">
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
