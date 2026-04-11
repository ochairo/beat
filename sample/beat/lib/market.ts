import type { Pulse } from "@ochairo/pulse";
import type { MarketRow } from "../types.js";
import { clamp, roundTo } from "./format.js";

const SYMBOLS = [
  "ALP",
  "NVA",
  "KYO",
  "MTR",
  "SOL",
  "ARC",
  "LUX",
  "ION",
  "PVT",
  "ORB",
  "VLT",
  "BRM",
];
const VENUES = ["TYO", "SIN", "FRA", "NY4", "LON", "SYD"];

let rngSeed = 17;

export function createMarketRows(count: number): MarketRow[] {
  return Array.from({ length: count }, (_, index) => {
    const symbol = `${SYMBOLS[index % SYMBOLS.length]}-${(index % 9) + 1}`;
    const venue = VENUES[index % VENUES.length] ?? "TYO";
    const price = roundTo(38 + index * 0.37 + nextRandom() * 9, 2);
    const volume = 120_000 + Math.floor(nextRandom() * 2_900_000);
    const change = roundTo((nextRandom() - 0.5) * 6, 2);
    const trades = 30 + Math.floor(nextRandom() * 900);
    const heat = clamp(
      Math.round(Math.abs(change) * 14 + nextRandom() * 20),
      6,
      100,
    );

    return {
      id: index,
      symbol,
      venue,
      price,
      volume,
      change,
      trades,
      heat,
      focused: index === 0,
    };
  });
}

export function collectMarketRowPulses(
  rows: Pulse<readonly MarketRow[]>,
): Pulse<MarketRow>[] {
  return rows
    .get()
    .map((_, index) => rows[index])
    .filter((row): row is Pulse<MarketRow> => row !== undefined);
}

export function mutateRow(row: Pulse<MarketRow>): void {
  const currentRow = row.get();
  const nextPrice = roundTo(currentRow.price + (nextRandom() - 0.5) * 1.8, 2);
  const nextChange = roundTo((nextRandom() - 0.5) * 8, 2);
  const nextVolume = Math.max(
    10_000,
    currentRow.volume + Math.floor((nextRandom() - 0.48) * 60_000),
  );
  const nextTrades = Math.max(
    1,
    currentRow.trades + Math.floor(nextRandom() * 11),
  );
  const nextHeat = clamp(
    Math.round(Math.abs(nextChange) * 13 + nextRandom() * 16),
    6,
    100,
  );

  row.price.set(nextPrice);
  row.change.set(nextChange);
  row.volume.set(nextVolume);
  row.trades.set(nextTrades);
  row.heat.set(nextHeat);
}

export function stormRow(row: Pulse<MarketRow>): void {
  const currentRow = row.get();
  const drift = roundTo((nextRandom() - 0.5) * 0.9, 2);

  row.price.set(roundTo(currentRow.price + drift, 2));
  row.change.set(roundTo(currentRow.change + drift * 0.55, 2));
  row.heat.set(
    clamp(currentRow.heat + Math.floor((nextRandom() - 0.45) * 12), 4, 100),
  );
}

export function setMarketRowFocused(
  row: Pulse<MarketRow>,
  focused: boolean,
): void {
  if (row.focused.get() === focused) {
    return;
  }

  row.focused.set(focused);
}

export async function fetchMarketRows(rowCount: number): Promise<MarketRow[]> {
  const response = await fetch(`/api/market?rows=${rowCount.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to load market rows: ${response.status}`);
  }

  const payload = (await response.json()) as { rows?: MarketRow[] };
  if (!Array.isArray(payload.rows)) {
    throw new Error("Backend response did not include rows.");
  }

  return payload.rows;
}

function nextRandom(): number {
  rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
  return rngSeed / 0xffffffff;
}
