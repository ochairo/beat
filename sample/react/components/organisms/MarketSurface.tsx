import { memo } from "react";
import type { MarketStore, SurfaceMode } from "../../types.js";
import { CardRow } from "./CardRow.js";
import { EditorRow } from "./EditorRow.js";
import { TableRow } from "./TableRow.js";

interface MarketSurfaceProps {
  readonly store: MarketStore;
  readonly rowIds: readonly number[];
  readonly surfaceMode: SurfaceMode;
}

const CardSurface = memo(function CardSurface(
  props: Pick<MarketSurfaceProps, "store" | "rowIds">,
): JSX.Element {
  return (
    <div className="market-grid">
      {props.rowIds.map((rowId) => (
        <CardRow key={rowId} store={props.store} rowId={rowId} />
      ))}
    </div>
  );
});

const EditorSurface = memo(function EditorSurface(
  props: Pick<MarketSurfaceProps, "store" | "rowIds">,
): JSX.Element {
  return (
    <div className="editor-grid">
      {props.rowIds.map((rowId) => (
        <EditorRow key={rowId} store={props.store} rowId={rowId} />
      ))}
    </div>
  );
});

const TableSurface = memo(function TableSurface(
  props: Pick<MarketSurfaceProps, "store" | "rowIds">,
): JSX.Element {
  return (
    <div className="order-book">
      <div className="order-book__header">
        <div className="column-symbol">Symbol</div>
        <div className="column-venue">Venue</div>
        <div className="column-price">Price</div>
        <div className="column-change">Change</div>
        <div className="column-volume">Volume</div>
        <div className="column-trades">Trades</div>
        <div className="column-heat">Heat</div>
      </div>
      <div className="order-book__body">
        {props.rowIds.map((rowId) => (
          <TableRow key={rowId} store={props.store} rowId={rowId} />
        ))}
      </div>
    </div>
  );
});

export const MarketSurface = memo(function MarketSurface(
  props: MarketSurfaceProps,
): JSX.Element {
  if (props.surfaceMode === "cards") {
    return <CardSurface store={props.store} rowIds={props.rowIds} />;
  }

  if (props.surfaceMode === "editor") {
    return <EditorSurface store={props.store} rowIds={props.rowIds} />;
  }

  return <TableSurface store={props.store} rowIds={props.rowIds} />;
});
