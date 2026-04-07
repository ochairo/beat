import type { BeatCleanup } from "@ochairo/beat";
import type { Pulse } from "@ochairo/pulse";
import { formatHeatTransform } from "./format.js";
import type { MarketRow, RowClassState } from "../types.js";

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
  element.style.transform = formatHeatTransform(value);
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
  binding.applyAll(row.get());

  return row.on((event) => {
    const nextRow = event.currentValue;

    if (event.changes.length === 0) {
      applyMarketRowDiff(binding, event.previousValue, nextRow);
      return;
    }

    for (const change of event.changes) {
      if (change.path.length !== 1 || typeof change.key !== "string") {
        applyMarketRowDiff(binding, event.previousValue, nextRow);
        return;
      }

      switch (change.key) {
        case "price":
          binding.applyPrice?.(nextRow.price, nextRow);
          break;
        case "change":
          binding.applyChange?.(nextRow.change, nextRow);
          break;
        case "volume":
          binding.applyVolume?.(nextRow.volume, nextRow);
          break;
        case "trades":
          binding.applyTrades?.(nextRow.trades, nextRow);
          break;
        case "heat":
          binding.applyHeat?.(nextRow.heat, nextRow);
          break;
        case "focused":
          binding.applyFocused?.(nextRow.focused, nextRow);
          break;
        default:
          applyMarketRowDiff(binding, event.previousValue, nextRow);
          return;
      }
    }
  });
}

export function getRowClassName(baseClassName: string, row: MarketRow): string {
  return `${baseClassName} ${row.focused ? "is-focused" : ""} ${row.change >= 0 ? "is-up" : "is-down"}`.trim();
}

export function applyRowState(
  element: HTMLElement,
  row: MarketRow,
  state: RowClassState,
): void {
  if (row.focused !== state.focused) {
    state.focused = row.focused;
    element.classList.toggle("is-focused", row.focused);
  }

  const nextPositiveChange = row.change >= 0;
  if (nextPositiveChange !== state.positiveChange) {
    state.positiveChange = nextPositiveChange;
    element.classList.toggle("is-up", nextPositiveChange);
    element.classList.toggle("is-down", !nextPositiveChange);
  }
}

function applyMarketRowDiff(
  binding: MarketRowBinding,
  previousRow: MarketRow,
  nextRow: MarketRow,
): void {
  if (
    previousRow.id !== nextRow.id ||
    previousRow.symbol !== nextRow.symbol ||
    previousRow.venue !== nextRow.venue
  ) {
    binding.applyAll(nextRow);
    return;
  }

  if (
    (!Object.is(previousRow.price, nextRow.price) && !binding.applyPrice) ||
    (!Object.is(previousRow.change, nextRow.change) && !binding.applyChange) ||
    (!Object.is(previousRow.volume, nextRow.volume) && !binding.applyVolume) ||
    (!Object.is(previousRow.trades, nextRow.trades) && !binding.applyTrades) ||
    (!Object.is(previousRow.heat, nextRow.heat) && !binding.applyHeat) ||
    (!Object.is(previousRow.focused, nextRow.focused) && !binding.applyFocused)
  ) {
    binding.applyAll(nextRow);
    return;
  }

  if (!Object.is(previousRow.price, nextRow.price)) {
    binding.applyPrice?.(nextRow.price, nextRow);
  }

  if (!Object.is(previousRow.change, nextRow.change)) {
    binding.applyChange?.(nextRow.change, nextRow);
  }

  if (!Object.is(previousRow.volume, nextRow.volume)) {
    binding.applyVolume?.(nextRow.volume, nextRow);
  }

  if (!Object.is(previousRow.trades, nextRow.trades)) {
    binding.applyTrades?.(nextRow.trades, nextRow);
  }

  if (!Object.is(previousRow.heat, nextRow.heat)) {
    binding.applyHeat?.(nextRow.heat, nextRow);
  }

  if (!Object.is(previousRow.focused, nextRow.focused)) {
    binding.applyFocused?.(nextRow.focused, nextRow);
  }
}
