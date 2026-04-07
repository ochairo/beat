/** @jsxImportSource @ochairo/beat */
import { component, onCleanup, type BeatCleanup } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { MarketRow, RowClassState } from "../../types.js";
import {
  applyRowState,
  bindMarketRow,
  disposeCleanups,
  getRowClassName,
  registerCleanup,
} from "../../lib/dom-bindings.js";
import { formatInteger, formatPercent } from "../../lib/format.js";

interface EditorRowProps {
  readonly row: Pulse<MarketRow>;
}

export const EditorRow = component<EditorRowProps>((props) => {
  const currentRow = props.row.get();
  const cleanups: BeatCleanup[] = [];
  const classState: RowClassState = {
    focused: currentRow.focused,
    positiveChange: currentRow.change >= 0,
  };
  const fieldState = {
    priceText: currentRow.price.toFixed(2),
    changeText: formatPercent(currentRow.change),
    volumeText: formatInteger(currentRow.volume),
    tradesText: formatInteger(currentRow.trades),
    focused: currentRow.focused,
  };
  let editorElement: HTMLElement | undefined;
  let priceInput: HTMLInputElement | undefined;
  let changeInput: HTMLInputElement | undefined;
  let volumeInput: HTMLInputElement | undefined;
  let tradesInput: HTMLInputElement | undefined;
  let heatInput: HTMLInputElement | undefined;
  let focusedInput: HTMLInputElement | undefined;
  let bound = false;

  const tryBind = (): void => {
    if (
      bound ||
      !editorElement ||
      !priceInput ||
      !changeInput ||
      !volumeInput ||
      !tradesInput ||
      !heatInput ||
      !focusedInput
    ) {
      return;
    }

    bound = true;
    const boundEditorElement = editorElement;
    const boundClassState = classState;
    const boundPriceInput = priceInput;
    const boundChangeInput = changeInput;
    const boundVolumeInput = volumeInput;
    const boundTradesInput = tradesInput;
    const boundHeatInput = heatInput;
    const boundFocusedInput = focusedInput;
    const boundFieldState = fieldState;
    registerCleanup(
      cleanups,
      bindMarketRow(props.row, {
        applyAll(value) {
          applyRowState(boundEditorElement, value, boundClassState);
          boundFieldState.priceText = value.price.toFixed(2);
          boundFieldState.changeText = formatPercent(value.change);
          boundFieldState.volumeText = formatInteger(value.volume);
          boundFieldState.tradesText = formatInteger(value.trades);
          boundFieldState.focused = value.focused;
          boundPriceInput.value = boundFieldState.priceText;
          boundChangeInput.value = boundFieldState.changeText;
          boundVolumeInput.value = boundFieldState.volumeText;
          boundTradesInput.value = boundFieldState.tradesText;
          boundHeatInput.value = String(value.heat);
          boundFocusedInput.checked = value.focused;
        },
        applyPrice(value) {
          const nextPriceText = value.toFixed(2);
          if (nextPriceText !== boundFieldState.priceText) {
            boundFieldState.priceText = nextPriceText;
            boundPriceInput.value = nextPriceText;
          }
        },
        applyChange(value, nextRow) {
          const nextChangeText = formatPercent(value);
          if (nextChangeText !== boundFieldState.changeText) {
            boundFieldState.changeText = nextChangeText;
            boundChangeInput.value = nextChangeText;
          }
          if (
            value >= 0 !== boundClassState.positiveChange ||
            nextRow.focused !== boundClassState.focused
          ) {
            applyRowState(boundEditorElement, nextRow, boundClassState);
          }
        },
        applyVolume(value) {
          const nextVolumeText = formatInteger(value);
          if (nextVolumeText !== boundFieldState.volumeText) {
            boundFieldState.volumeText = nextVolumeText;
            boundVolumeInput.value = nextVolumeText;
          }
        },
        applyTrades(value) {
          const nextTradesText = formatInteger(value);
          if (nextTradesText !== boundFieldState.tradesText) {
            boundFieldState.tradesText = nextTradesText;
            boundTradesInput.value = nextTradesText;
          }
        },
        applyHeat(value) {
          boundHeatInput.value = String(value);
        },
        applyFocused(value, nextRow) {
          if (nextRow.focused !== boundClassState.focused) {
            applyRowState(boundEditorElement, nextRow, boundClassState);
          }
          if (value !== boundFieldState.focused) {
            boundFieldState.focused = value;
            boundFocusedInput.checked = value;
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
      class={getRowClassName("market-editor", currentRow)}
      ref={(node) => {
        if (node instanceof HTMLElement) {
          editorElement = node;
          tryBind();
        }
      }}
    >
      <div class="market-editor__header">
        <div>
          <strong>{currentRow.symbol}</strong>
          <span>{currentRow.venue}</span>
        </div>
        <span class="market-editor__id">
          {`#${currentRow.id.toString().padStart(3, "0")}`}
        </span>
      </div>

      <div class="editor-fields">
        <label class="editor-field">
          <span>Price</span>
          <input
            class="editor-input"
            readOnly
            value={currentRow.price.toFixed(2)}
            ref={(node) => {
              if (node instanceof HTMLInputElement) {
                priceInput = node;
                tryBind();
              }
            }}
          />
        </label>
        <label class="editor-field">
          <span>Change</span>
          <input
            class="editor-input"
            readOnly
            value={formatPercent(currentRow.change)}
            ref={(node) => {
              if (node instanceof HTMLInputElement) {
                changeInput = node;
                tryBind();
              }
            }}
          />
        </label>
        <label class="editor-field">
          <span>Volume</span>
          <input
            class="editor-input"
            readOnly
            value={formatInteger(currentRow.volume)}
            ref={(node) => {
              if (node instanceof HTMLInputElement) {
                volumeInput = node;
                tryBind();
              }
            }}
          />
        </label>
        <label class="editor-field">
          <span>Trades</span>
          <input
            class="editor-input"
            readOnly
            value={formatInteger(currentRow.trades)}
            ref={(node) => {
              if (node instanceof HTMLInputElement) {
                tradesInput = node;
                tryBind();
              }
            }}
          />
        </label>
      </div>

      <div class="editor-controls">
        <label class="editor-slider">
          <span>Heat</span>
          <input
            type="range"
            min="0"
            max="100"
            value={currentRow.heat.toString()}
            disabled
            ref={(node) => {
              if (node instanceof HTMLInputElement) {
                heatInput = node;
                tryBind();
              }
            }}
          />
        </label>
        <label class="editor-toggle">
          <span>Focused</span>
          <input
            class="editor-checkbox"
            type="checkbox"
            checked={currentRow.focused}
            disabled
            ref={(node) => {
              if (node instanceof HTMLInputElement) {
                focusedInput = node;
                tryBind();
              }
            }}
          />
        </label>
      </div>
    </article>
  );
});
