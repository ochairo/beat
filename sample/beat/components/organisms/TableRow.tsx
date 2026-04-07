/** @jsxImportSource @ochairo/beat */
import { component, onCleanup, type BeatCleanup } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { MarketRow, RowClassState } from "../../types.js";
import {
  applyHeatFill,
  applyRowState,
  bindMarketRow,
  disposeCleanups,
  getRowClassName,
  mountTextNode,
  registerCleanup,
} from "../../lib/dom-bindings.js";
import {
  formatCurrency,
  formatHeatTransform,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";

interface TableRowProps {
  readonly onHoverRow: ((rowId: number) => void) | undefined;
  readonly row: Pulse<MarketRow>;
}

export const TableRow = component<TableRowProps>((props) => {
  const currentRow = props.row.get();
  const cleanups: BeatCleanup[] = [];
  const classState: RowClassState = {
    focused: currentRow.focused,
    positiveChange: currentRow.change >= 0,
  };
  let rowElement: HTMLElement | undefined;
  let priceTextNode: Text | undefined;
  let changeTextNode: Text | undefined;
  let volumeTextNode: Text | undefined;
  let tradesTextNode: Text | undefined;
  let heatFillElement: HTMLElement | undefined;
  let bound = false;

  const tryBind = (): void => {
    if (
      bound ||
      !rowElement ||
      !priceTextNode ||
      !changeTextNode ||
      !volumeTextNode ||
      !tradesTextNode ||
      !heatFillElement
    ) {
      return;
    }

    bound = true;
    const boundRowElement = rowElement;
    const boundClassState = classState;
    const boundPriceTextNode = priceTextNode;
    const boundChangeTextNode = changeTextNode;
    const boundVolumeTextNode = volumeTextNode;
    const boundTradesTextNode = tradesTextNode;
    const boundHeatFillElement = heatFillElement;
    registerCleanup(
      cleanups,
      bindMarketRow(props.row, {
        applyAll(value) {
          applyRowState(boundRowElement, value, boundClassState);
          boundPriceTextNode.data = formatCurrency(value.price);
          boundChangeTextNode.data = formatPercent(value.change);
          boundVolumeTextNode.data = formatInteger(value.volume);
          boundTradesTextNode.data = formatInteger(value.trades);
          applyHeatFill(boundHeatFillElement, value.heat);
        },
        applyPrice(value) {
          boundPriceTextNode.data = formatCurrency(value);
        },
        applyChange(value, nextRow) {
          boundChangeTextNode.data = formatPercent(value);
          if (
            value >= 0 !== boundClassState.positiveChange ||
            nextRow.focused !== boundClassState.focused
          ) {
            applyRowState(boundRowElement, nextRow, boundClassState);
          }
        },
        applyVolume(value) {
          boundVolumeTextNode.data = formatInteger(value);
        },
        applyTrades(value) {
          boundTradesTextNode.data = formatInteger(value);
        },
        applyHeat(value) {
          applyHeatFill(boundHeatFillElement, value);
        },
        applyFocused(_value, nextRow) {
          if (nextRow.focused !== boundClassState.focused) {
            applyRowState(boundRowElement, nextRow, boundClassState);
          }
        },
      }),
    );
  };

  onCleanup(() => {
    disposeCleanups(cleanups);
  });

  return (
    <article
      class={getRowClassName("order-book__row", currentRow)}
      onMouseEnter={() => {
        props.onHoverRow?.(currentRow.id);
      }}
      ref={(node) => {
        if (node instanceof HTMLElement) {
          rowElement = node;
          tryBind();
        }
      }}
    >
      <div class="row-symbol">
        <strong>{currentRow.symbol}</strong>
        <span>{`#${currentRow.id.toString().padStart(3, "0")}`}</span>
      </div>
      <div class="row-venue">{currentRow.venue}</div>
      <div
        class="row-price"
        ref={(node) => {
          if (node instanceof HTMLElement) {
            mountTextNode(
              node,
              formatCurrency(currentRow.price),
              (textNode) => {
                priceTextNode = textNode;
              },
            );
            tryBind();
          }
        }}
      />
      <div
        class="row-change"
        ref={(node) => {
          if (node instanceof HTMLElement) {
            mountTextNode(
              node,
              formatPercent(currentRow.change),
              (textNode) => {
                changeTextNode = textNode;
              },
            );
            tryBind();
          }
        }}
      />
      <div
        class="row-volume"
        ref={(node) => {
          if (node instanceof HTMLElement) {
            mountTextNode(
              node,
              formatInteger(currentRow.volume),
              (textNode) => {
                volumeTextNode = textNode;
              },
            );
            tryBind();
          }
        }}
      />
      <div
        class="row-trades"
        ref={(node) => {
          if (node instanceof HTMLElement) {
            mountTextNode(
              node,
              formatInteger(currentRow.trades),
              (textNode) => {
                tradesTextNode = textNode;
              },
            );
            tryBind();
          }
        }}
      />
      <div class="row-heat">
        <div class="row-heatbar">
          <div
            class="row-heatbar__fill"
            style={{ transform: formatHeatTransform(currentRow.heat) }}
            ref={(node) => {
              if (node instanceof HTMLElement) {
                heatFillElement = node;
                tryBind();
              }
            }}
          />
        </div>
      </div>
    </article>
  );
});
