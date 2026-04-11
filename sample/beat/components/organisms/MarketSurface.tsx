/** @jsxImportSource @ochairo/beat */
import { For, component } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { MarketRow, SurfaceMode } from "../../types.js";
import { CardRow } from "./CardRow.js";
import { EditorRow } from "./EditorRow.js";
import { TableRow } from "./TableRow.js";

interface MarketSurfaceProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly rows: Pulse<readonly MarketRow[]>;
  readonly surfaceMode: SurfaceMode;
}

const CardSurface = component<{
  onHoverRow: ((rowId: number) => void) | undefined;
  rows: Pulse<readonly MarketRow[]>;
}>((props) => {
  return (
    <div class="market-grid">
      <For each={props.rows} key={(value) => value.id}>
        {(row) => <CardRow row={row} onHoverRow={props.onHoverRow} />}
      </For>
    </div>
  );
});

const EditorSurface = component<{
  onHoverRow: ((rowId: number) => void) | undefined;
  rows: Pulse<readonly MarketRow[]>;
}>((props) => {
  return (
    <div class="editor-grid">
      <For each={props.rows} key={(value) => value.id}>
        {(row) => <EditorRow row={row} onHoverRow={props.onHoverRow} />}
      </For>
    </div>
  );
});

const TableSurface = component<{
  onHoverRow: ((rowId: number) => void) | undefined;
  rows: Pulse<readonly MarketRow[]>;
}>((props) => {
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
        <For each={props.rows} key={(value) => value.id}>
          {(row) => <TableRow row={row} onHoverRow={props.onHoverRow} />}
        </For>
      </div>
    </div>
  );
});

export const MarketSurface = component<MarketSurfaceProps>((props) => {
  if (props.surfaceMode === "cards") {
    return <CardSurface rows={props.rows} onHoverRow={props.onHoverRow} />;
  }

  if (props.surfaceMode === "editor") {
    return <EditorSurface rows={props.rows} onHoverRow={props.onHoverRow} />;
  }

  return <TableSurface rows={props.rows} onHoverRow={props.onHoverRow} />;
});
