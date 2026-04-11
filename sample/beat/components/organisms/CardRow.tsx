/** @jsxImportSource @ochairo/beat */
import { component, onCleanup, type BeatCleanup } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { MarketRow, RowClassState } from "../../types.js";
import {
  applyHeatWidth,
  applyRowClassState,
  applyRowState,
  bindMarketRow,
  disposeCleanups,
  getRowClassName,
  mountTextNode,
  readHeatWidth,
  registerCleanup,
} from "../../lib/dom-bindings.js";
import {
  formatCurrency,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";

interface CardRowProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly row: Pulse<MarketRow>;
}

export const CardRow = component<CardRowProps>((props) => {
  const currentRow = props.row.get();
  const initialClassName = getRowClassName("market-card", currentRow);
  const cleanups: BeatCleanup[] = [];
  const classState: RowClassState = {
    baseClassName: "market-card",
    focused: currentRow.focused,
    heatWidth: readHeatWidth(currentRow.heat),
    positiveChange: currentRow.change >= 0,
  };
  const fieldState = {
    priceText: formatCurrency(currentRow.price),
    changeText: formatPercent(currentRow.change),
    volumeText: formatInteger(currentRow.volume),
    tradesText: formatInteger(currentRow.trades),
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
    const boundFieldState = fieldState;

    const setPriceText = (value: number): void => {
      const nextPriceText = formatCurrency(value);

      if (nextPriceText !== boundFieldState.priceText) {
        boundFieldState.priceText = nextPriceText;
        boundPriceTextNode.data = nextPriceText;
      }
    };

    const setChangeText = (value: number): void => {
      const nextChangeText = formatPercent(value);

      if (nextChangeText !== boundFieldState.changeText) {
        boundFieldState.changeText = nextChangeText;
        boundChangeTextNode.data = nextChangeText;
      }
    };

    const setVolumeText = (value: number): void => {
      const nextVolumeText = formatInteger(value);

      if (nextVolumeText !== boundFieldState.volumeText) {
        boundFieldState.volumeText = nextVolumeText;
        boundVolumeTextNode.data = nextVolumeText;
      }
    };

    const setTradesText = (value: number): void => {
      const nextTradesText = formatInteger(value);

      if (nextTradesText !== boundFieldState.tradesText) {
        boundFieldState.tradesText = nextTradesText;
        boundTradesTextNode.data = nextTradesText;
      }
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
          applyRowState(boundCardElement, value, boundClassState);
          setPriceText(value.price);
          setChangeText(value.change);
          setVolumeText(value.volume);
          setTradesText(value.trades);
          setHeatFill(value.heat);
        },
        applyPrice(value) {
          setPriceText(value);
        },
        applyChange(value) {
          setChangeText(value);
          const nextPositiveChange = value >= 0;

          if (nextPositiveChange !== boundClassState.positiveChange) {
            applyRowClassState(
              boundCardElement,
              boundClassState,
              boundClassState.focused,
              nextPositiveChange,
            );
          }
        },
        applyVolume(value) {
          setVolumeText(value);
        },
        applyTrades(value) {
          setTradesText(value);
        },
        applyHeat(value) {
          setHeatFill(value);
        },
        applyFocused(value) {
          if (value !== boundClassState.focused) {
            applyRowClassState(
              boundCardElement,
              boundClassState,
              value,
              boundClassState.positiveChange,
            );
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
      class={initialClassName}
      onMouseEnter={() => {
        props.onHoverRow?.(currentRow.id);
      }}
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
            mountTextNode(node, fieldState.priceText, (textNode) => {
              priceTextNode = textNode;
            });
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
                mountTextNode(node, fieldState.changeText, (textNode) => {
                  changeTextNode = textNode;
                });
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
                mountTextNode(node, fieldState.volumeText, (textNode) => {
                  volumeTextNode = textNode;
                });
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
                mountTextNode(node, fieldState.tradesText, (textNode) => {
                  tradesTextNode = textNode;
                });
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
