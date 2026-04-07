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

interface CardRowProps {
  readonly row: Pulse<MarketRow>;
}

export const CardRow = component<CardRowProps>((props) => {
  const currentRow = props.row.get();
  const cleanups: BeatCleanup[] = [];
  const classState: RowClassState = {
    focused: currentRow.focused,
    positiveChange: currentRow.change >= 0,
  };
  let cardElement: HTMLElement | undefined;
  let priceTextNode: Text | undefined;
  let changeTextNode: Text | undefined;
  let volumeTextNode: Text | undefined;
  let tradesTextNode: Text | undefined;
  let heatFillElement: HTMLElement | undefined;
  let bound = false;

  const tryBind = (): void => {
    if (
      bound ||
      !cardElement ||
      !priceTextNode ||
      !changeTextNode ||
      !volumeTextNode ||
      !tradesTextNode ||
      !heatFillElement
    ) {
      return;
    }

    bound = true;
    const boundCardElement = cardElement;
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
          applyRowState(boundCardElement, value, boundClassState);
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
            applyRowState(boundCardElement, nextRow, boundClassState);
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
            applyRowState(boundCardElement, nextRow, boundClassState);
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
      class={getRowClassName("market-card", currentRow)}
      ref={(node) => {
        if (node instanceof HTMLElement) {
          cardElement = node;
          tryBind();
        }
      }}
    >
      <div class="market-card__header">
        <div>
          <strong>{currentRow.symbol}</strong>
          <span>{currentRow.venue}</span>
        </div>
        <span class="market-card__id">
          {`#${currentRow.id.toString().padStart(3, "0")}`}
        </span>
      </div>
      <div
        class="market-card__price"
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
      <div class="market-card__meta">
        <div class="market-card__stat">
          <span>Change</span>
          <strong
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
        </div>
        <div class="market-card__stat">
          <span>Volume</span>
          <strong
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
        </div>
        <div class="market-card__stat">
          <span>Trades</span>
          <strong
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
        </div>
      </div>
      <div class="market-card__heat">
        <span>Heat</span>
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
