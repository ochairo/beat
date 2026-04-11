import {
  bindMasked,
  createObjectKeyMask,
  type BeatCleanup,
} from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import type { MarketRow, RowClassState } from "../types.js";

const MARKET_ROW_PRICE_MASK = 1 << 0;
const MARKET_ROW_CHANGE_MASK = 1 << 1;
const MARKET_ROW_VOLUME_MASK = 1 << 2;
const MARKET_ROW_TRADES_MASK = 1 << 3;
const MARKET_ROW_HEAT_MASK = 1 << 4;
const MARKET_ROW_FOCUSED_MASK = 1 << 5;
const MARKET_ROW_FULL_MASK =
  MARKET_ROW_PRICE_MASK |
  MARKET_ROW_CHANGE_MASK |
  MARKET_ROW_VOLUME_MASK |
  MARKET_ROW_TRADES_MASK |
  MARKET_ROW_HEAT_MASK |
  MARKET_ROW_FOCUSED_MASK;
const HEAT_WIDTH_TEXT = Array.from(
  { length: 101 },
  (_, index) => `${(index / 100).toFixed(2)}`,
);

const getMarketRowChangeMask = createObjectKeyMask<MarketRow>(
  {
    price: MARKET_ROW_PRICE_MASK,
    change: MARKET_ROW_CHANGE_MASK,
    volume: MARKET_ROW_VOLUME_MASK,
    trades: MARKET_ROW_TRADES_MASK,
    heat: MARKET_ROW_HEAT_MASK,
    focused: MARKET_ROW_FOCUSED_MASK,
  },
  MARKET_ROW_FULL_MASK,
);

export interface MarketRowBinding {
  applyAll(value: MarketRow): void;
  applyPrice?(value: number, row: MarketRow): void;
  applyChange?(value: number, row: MarketRow): void;
  applyVolume?(value: number, row: MarketRow): void;
  applyTrades?(value: number, row: MarketRow): void;
  applyHeat?(value: number, row: MarketRow): void;
  applyFocused?(value: boolean, row: MarketRow): void;
}

export function applyHeatFill(element: HTMLElement, value: number): void {
  applyHeatWidth(element, readHeatWidth(value));
}

export function readHeatWidth(value: number): string {
  const clampedValue = Math.max(0, Math.min(100, Math.round(value)));
  return HEAT_WIDTH_TEXT[clampedValue] ?? "1.00";
}

export function applyHeatWidth(element: HTMLElement, width: string): void {
  element.style.transform = `scaleX(${width})`;
}

export function registerCleanup(
  target: BeatCleanup[],
  cleanup: BeatCleanup,
): void {
  target.push(cleanup);
}

export function disposeCleanups(cleanups: readonly BeatCleanup[]): void {
  for (const cleanup of cleanups) {
    cleanup();
  }
}

export function mountTextNode(
  element: HTMLElement,
  text: string,
  assign: (node: Text) => void,
): void {
  const textNode = document.createTextNode(text);
  element.replaceChildren(textNode);
  assign(textNode);
}

export function bindMarketRow(
  row: Pulse<MarketRow>,
  binding: MarketRowBinding,
): BeatCleanup {
  const applyPrice = binding.applyPrice;
  const applyChange = binding.applyChange;
  const applyVolume = binding.applyVolume;
  const applyTrades = binding.applyTrades;
  const applyHeat = binding.applyHeat;
  const applyFocused = binding.applyFocused;

  return bindMasked(row, {
    fullMask: MARKET_ROW_FULL_MASK,
    getChangeMask: getMarketRowChangeMask,
    apply(value, mask) {
      if (mask === MARKET_ROW_FULL_MASK) {
        binding.applyAll(value);
        return;
      }

      if ((mask & MARKET_ROW_PRICE_MASK) !== 0) {
        if (!applyPrice) {
          binding.applyAll(value);
          return;
        }

        applyPrice(value.price, value);
      }

      if ((mask & MARKET_ROW_CHANGE_MASK) !== 0) {
        if (!applyChange) {
          binding.applyAll(value);
          return;
        }

        applyChange(value.change, value);
      }

      if ((mask & MARKET_ROW_VOLUME_MASK) !== 0) {
        if (!applyVolume) {
          binding.applyAll(value);
          return;
        }

        applyVolume(value.volume, value);
      }

      if ((mask & MARKET_ROW_TRADES_MASK) !== 0) {
        if (!applyTrades) {
          binding.applyAll(value);
          return;
        }

        applyTrades(value.trades, value);
      }

      if ((mask & MARKET_ROW_HEAT_MASK) !== 0) {
        if (!applyHeat) {
          binding.applyAll(value);
          return;
        }

        applyHeat(value.heat, value);
      }

      if ((mask & MARKET_ROW_FOCUSED_MASK) !== 0) {
        if (!applyFocused) {
          binding.applyAll(value);
          return;
        }

        applyFocused(value.focused, value);
      }
    },
  });
}

export function getRowClassName(baseClassName: string, row: MarketRow): string {
  return readRowClassName(baseClassName, row.focused, row.change >= 0);
}

export function readRowClassName(
  baseClassName: string,
  focused: boolean,
  positiveChange: boolean,
): string {
  const focusClassName = focused ? " is-focused" : "";
  return `${baseClassName}${focusClassName}${positiveChange ? " is-up" : " is-down"}`;
}

export function applyRowState(
  element: HTMLElement,
  row: MarketRow,
  state: RowClassState,
): void {
  applyRowClassState(element, state, row.focused, row.change >= 0);
}

export function applyRowClassState(
  element: HTMLElement,
  state: RowClassState,
  nextFocused: boolean,
  nextPositiveChange: boolean,
): void {
  if (
    nextFocused === state.focused &&
    nextPositiveChange === state.positiveChange
  ) {
    return;
  }

  if (nextFocused !== state.focused) {
    state.focused = nextFocused;
    element.classList.toggle("is-focused", nextFocused);
  }

  if (nextPositiveChange !== state.positiveChange) {
    state.positiveChange = nextPositiveChange;
    element.classList.toggle("is-up", nextPositiveChange);
    element.classList.toggle("is-down", !nextPositiveChange);
  }
}
