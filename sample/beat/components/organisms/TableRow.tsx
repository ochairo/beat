/** @jsxImportSource @ochairo/beat */
import { component, onCleanup, type BeatCleanup } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { MarketRow } from "../../types.js";
import {
  applyHeatWidth,
  bindMarketRow,
  disposeCleanups,
  mountTextNode,
  readHeatWidth,
  registerCleanup,
} from "../../lib/dom-bindings.js";
import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";

interface TableRowProps {
  readonly onHoverRow: ((rowId: number) => void) | undefined;
  readonly row: Pulse<MarketRow>;
}

const PRICE_FIELD_INDEX = 0;
const CHANGE_FIELD_INDEX = 1;
const VOLUME_FIELD_INDEX = 2;
const TRADES_FIELD_INDEX = 3;

type TableRowFieldTextState = [string, string, string, string];
type TableRowTextNodes = [Text, Text, Text, Text];
type TableRowVisualState = {
  focused: boolean;
  heatWidth: string;
  positiveChange: boolean;
};

function writeCachedNumberText(
  textState: TableRowFieldTextState,
  index: 0 | 1 | 2 | 3,
  textNode: Text,
  nextValue: number,
  format: (value: number) => string,
): void {
  const nextText = format(nextValue);

  if (nextText !== textState[index]) {
    textState[index] = nextText;
    textNode.data = nextText;
  }
}

function applyAllRowText(
  textState: TableRowFieldTextState,
  textNodes: TableRowTextNodes,
  row: MarketRow,
): void {
  writeCachedNumberText(
    textState,
    PRICE_FIELD_INDEX,
    textNodes[PRICE_FIELD_INDEX],
    row.price,
    formatCurrency,
  );
  writeCachedNumberText(
    textState,
    CHANGE_FIELD_INDEX,
    textNodes[CHANGE_FIELD_INDEX],
    row.change,
    formatPercent,
  );
  writeCachedNumberText(
    textState,
    VOLUME_FIELD_INDEX,
    textNodes[VOLUME_FIELD_INDEX],
    row.volume,
    formatInteger,
  );
  writeCachedNumberText(
    textState,
    TRADES_FIELD_INDEX,
    textNodes[TRADES_FIELD_INDEX],
    row.trades,
    formatInteger,
  );
}

export const TableRow = component<TableRowProps>((props) => {
  const currentRow = props.row.get();
  const initialClassName = currentRow.focused
    ? "order-book__row is-focused"
    : "order-book__row";
  const cleanups: BeatCleanup[] = [];
  const classState: TableRowVisualState = {
    focused: currentRow.focused,
    heatWidth: readHeatWidth(currentRow.heat),
    positiveChange: currentRow.change >= 0,
  };
  const fieldTextState: TableRowFieldTextState = [
    formatCurrency(currentRow.price),
    formatPercent(currentRow.change),
    formatInteger(currentRow.volume),
    formatInteger(currentRow.trades),
  ];
  let rowElement: HTMLElement | undefined;
  let priceElement: HTMLElement | undefined;
  let changeElement: HTMLElement | undefined;
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
      !priceElement ||
      !changeElement ||
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
    const boundPriceElement = priceElement;
    const boundChangeElement = changeElement;
    const boundPriceTextNode = priceTextNode;
    const boundChangeTextNode = changeTextNode;
    const boundVolumeTextNode = volumeTextNode;
    const boundTradesTextNode = tradesTextNode;
    const boundHeatFillElement = heatFillElement;
    const boundFieldTextState = fieldTextState;
    const boundTextNodes: TableRowTextNodes = [
      boundPriceTextNode,
      boundChangeTextNode,
      boundVolumeTextNode,
      boundTradesTextNode,
    ];

    const applyFocusedState = (focused: boolean): void => {
      if (focused === boundClassState.focused) {
        return;
      }

      boundClassState.focused = focused;
      boundRowElement.classList.toggle("is-focused", focused);
    };

    const applyTrendState = (positiveChange: boolean): void => {
      if (positiveChange === boundClassState.positiveChange) {
        return;
      }

      boundClassState.positiveChange = positiveChange;
      boundPriceElement.classList.toggle("is-up", positiveChange);
      boundPriceElement.classList.toggle("is-down", !positiveChange);
      boundChangeElement.classList.toggle("is-up", positiveChange);
      boundChangeElement.classList.toggle("is-down", !positiveChange);
    };

    const setHeatFill = (value: number): void => {
      const nextHeatWidth = readHeatWidth(value);

      if (nextHeatWidth !== boundClassState.heatWidth) {
        boundClassState.heatWidth = nextHeatWidth;
        applyHeatWidth(boundHeatFillElement, nextHeatWidth);
      }
    };

    registerCleanup(
      cleanups,
      bindMarketRow(props.row, {
        applyAll(value) {
          applyFocusedState(value.focused);
          applyTrendState(value.change >= 0);
          applyAllRowText(boundFieldTextState, boundTextNodes, value);
          setHeatFill(value.heat);
        },
        applyPrice(value) {
          writeCachedNumberText(
            boundFieldTextState,
            PRICE_FIELD_INDEX,
            boundPriceTextNode,
            value,
            formatCurrency,
          );
        },
        applyChange(value) {
          writeCachedNumberText(
            boundFieldTextState,
            CHANGE_FIELD_INDEX,
            boundChangeTextNode,
            value,
            formatPercent,
          );
          applyTrendState(value >= 0);
        },
        applyVolume(value) {
          writeCachedNumberText(
            boundFieldTextState,
            VOLUME_FIELD_INDEX,
            boundVolumeTextNode,
            value,
            formatInteger,
          );
        },
        applyTrades(value) {
          writeCachedNumberText(
            boundFieldTextState,
            TRADES_FIELD_INDEX,
            boundTradesTextNode,
            value,
            formatInteger,
          );
        },
        applyHeat(value) {
          setHeatFill(value);
        },
        applyFocused(value) {
          applyFocusedState(value);
        },
      }),
    );
  };

  onCleanup(() => {
    disposeCleanups(cleanups);
  });

  return (
    <article
      class={initialClassName}
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
        class={currentRow.change >= 0 ? "row-price is-up" : "row-price is-down"}
        ref={(node) => {
          if (node instanceof HTMLElement) {
            priceElement = node;
            mountTextNode(
              node,
              fieldTextState[PRICE_FIELD_INDEX],
              (textNode) => {
                priceTextNode = textNode;
              },
            );
            tryBind();
          }
        }}
      />
      <div
        class={
          currentRow.change >= 0 ? "row-change is-up" : "row-change is-down"
        }
        ref={(node) => {
          if (node instanceof HTMLElement) {
            changeElement = node;
            mountTextNode(
              node,
              fieldTextState[CHANGE_FIELD_INDEX],
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
              fieldTextState[VOLUME_FIELD_INDEX],
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
              fieldTextState[TRADES_FIELD_INDEX],
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
            style={{ transform: `scaleX(${classState.heatWidth})` }}
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
