import { Index } from "solid-js";
import type { MarketRow, SurfaceMode } from "../../types.js";
import { CardRow } from "./CardRow.js";
import { EditorRow } from "./EditorRow.js";
import { TableRow } from "./TableRow.js";

interface MarketSurfaceProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly rows: readonly MarketRow[];
  readonly surfaceMode: SurfaceMode;
}

function CardSurface(props: Pick<MarketSurfaceProps, "rows">): JSX.Element {
  return (
    <div class="market-grid">
      <Index each={props.rows}>{(row) => <CardRow row={row} />}</Index>
    </div>
  );
}

function EditorSurface(props: Pick<MarketSurfaceProps, "rows">): JSX.Element {
  return (
    <div class="editor-grid">
      <Index each={props.rows}>{(row) => <EditorRow row={row} />}</Index>
    </div>
  );
}

function TableSurface(
  props: Pick<MarketSurfaceProps, "onHoverRow" | "rows">,
): JSX.Element {
  return (
    <div class="order-book">
      <div class="order-book__header">
        <div class="column-symbol">Symbol</div>
        <div class="column-venue">Venue</div>
        <div class="column-price">Price</div>
        <div class="column-change">Change</div>
        <div class="column-volume">Volume</div>
        <div class="column-trades">Trades</div>
        <div class="column-heat">Heat</div>
      </div>
      <div class="order-book__body">
        <Index each={props.rows}>
          {(row) => <TableRow row={row} onHoverRow={props.onHoverRow} />}
        </Index>
      </div>
    </div>
  );
}

export function MarketSurface(props: MarketSurfaceProps): JSX.Element {
  if (props.surfaceMode === "cards") {
    return <CardSurface rows={props.rows} />;
  }

  if (props.surfaceMode === "editor") {
    return <EditorSurface rows={props.rows} />;
  }

  return <TableSurface rows={props.rows} onHoverRow={props.onHoverRow} />;
}
