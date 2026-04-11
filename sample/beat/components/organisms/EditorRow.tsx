/** @jsxImportSource @ochairo/beat */
import { component, onCleanup, type BeatCleanup } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { MarketRow, RowClassState } from "../../types.js";
import {
  applyRowClassState,
  applyRowState,
  bindMarketRow,
  disposeCleanups,
  getRowClassName,
  readHeatWidth,
  registerCleanup,
} from "../../lib/dom-bindings.js";
import {
  formatFixed2,
  formatInteger,
  formatPercent,
} from "../../lib/format.js";

interface EditorRowProps {
  readonly onHoverRow?: (rowId: number) => void;
  readonly row: Pulse<MarketRow>;
}

export const EditorRow = component<EditorRowProps>((props) => {
  const currentRow = props.row.get();
  const initialClassName = getRowClassName("market-editor", currentRow);
  const cleanups: BeatCleanup[] = [];
  const classState: RowClassState = {
    baseClassName: "market-editor",
    focused: currentRow.focused,
    heatWidth: readHeatWidth(currentRow.heat),
    positiveChange: currentRow.change >= 0,
  };
  const fieldState = {
    priceText: formatFixed2(currentRow.price),
    changeText: formatPercent(currentRow.change),
    volumeText: formatInteger(currentRow.volume),
    tradesText: formatInteger(currentRow.trades),
    heatText: currentRow.heat.toString(),
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

    const setPriceText = (value: number): void => {
      const nextPriceText = formatFixed2(value);

      if (nextPriceText !== boundFieldState.priceText) {
        boundFieldState.priceText = nextPriceText;
        boundPriceInput.value = nextPriceText;
      }
    };

    const setChangeText = (value: number): void => {
      const nextChangeText = formatPercent(value);

      if (nextChangeText !== boundFieldState.changeText) {
        boundFieldState.changeText = nextChangeText;
        boundChangeInput.value = nextChangeText;
      }
    };

    const setVolumeText = (value: number): void => {
      const nextVolumeText = formatInteger(value);

      if (nextVolumeText !== boundFieldState.volumeText) {
        boundFieldState.volumeText = nextVolumeText;
        boundVolumeInput.value = nextVolumeText;
      }
    };

    const setTradesText = (value: number): void => {
      const nextTradesText = formatInteger(value);

      if (nextTradesText !== boundFieldState.tradesText) {
        boundFieldState.tradesText = nextTradesText;
        boundTradesInput.value = nextTradesText;
      }
    };

    const setHeatValue = (value: number): void => {
      const nextHeatText = value.toString();

      if (nextHeatText !== boundFieldState.heatText) {
        boundFieldState.heatText = nextHeatText;
        boundHeatInput.value = nextHeatText;
      }
    };

    registerCleanup(
      cleanups,
      bindMarketRow(props.row, {
        applyAll(value) {
          applyRowState(boundEditorElement, value, boundClassState);
          setPriceText(value.price);
          setChangeText(value.change);
          setVolumeText(value.volume);
          setTradesText(value.trades);
          setHeatValue(value.heat);
          boundFieldState.focused = value.focused;
          boundFocusedInput.checked = value.focused;
        },
        applyPrice(value) {
          setPriceText(value);
        },
        applyChange(value) {
          setChangeText(value);
          const nextPositiveChange = value >= 0;

          if (nextPositiveChange !== boundClassState.positiveChange) {
            applyRowClassState(
              boundEditorElement,
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
          setHeatValue(value);
        },
        applyFocused(value) {
          if (value !== boundClassState.focused) {
            applyRowClassState(
              boundEditorElement,
              boundClassState,
              value,
              boundClassState.positiveChange,
            );
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
      class={initialClassName}
      onMouseEnter={() => {
        props.onHoverRow?.(currentRow.id);
      }}
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
            value={fieldState.priceText}
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
            value={fieldState.changeText}
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
            value={fieldState.volumeText}
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
            value={fieldState.tradesText}
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
            value={fieldState.heatText}
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
            checked={fieldState.focused}
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
