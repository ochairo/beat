import { createMutable } from "solid-js/store";
import { createInitialMetrics } from "./metrics.js";
import type { MarketModel, MarketRow, MutableMarketRow } from "../types.js";

let rngSeed = 17;

function nextRandom(): number {
  rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0;
  return rngSeed / 0xffffffff;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function mutateRowFields(
  row: MarketRow,
): Omit<MarketRow, "id" | "symbol" | "venue" | "focused"> {
  const nextPrice = roundTo(row.price + (nextRandom() - 0.5) * 1.8, 2);
  const nextChange = roundTo((nextRandom() - 0.5) * 8, 2);
  const nextVolume = Math.max(
    10_000,
    row.volume + Math.floor((nextRandom() - 0.48) * 60_000),
  );
  const nextTrades = Math.max(1, row.trades + Math.floor(nextRandom() * 11));
  const nextHeat = clamp(
    Math.round(Math.abs(nextChange) * 13 + nextRandom() * 16),
    6,
    100,
  );

  return {
    price: nextPrice,
    change: nextChange,
    volume: nextVolume,
    trades: nextTrades,
    heat: nextHeat,
  };
}

function stormRowFields(
  row: MarketRow,
): Pick<MarketRow, "price" | "change" | "heat"> {
  const drift = roundTo((nextRandom() - 0.5) * 0.9, 2);

  return {
    price: roundTo(row.price + drift, 2),
    change: roundTo(row.change + drift * 0.55, 2),
    heat: clamp(row.heat + Math.floor((nextRandom() - 0.45) * 12), 4, 100),
  };
}

export function createMarketModel(
  initialRows: readonly MarketRow[],
): MarketModel {
  const rows = createMutable(initialRows.slice() as MutableMarketRow[]);
  const metrics = createMutable(
    createInitialMetrics(
      "Ready. Solid is updating the board through path-level store writes.",
    ),
  );
  const focusedRowId = createMutable({ value: 0 });

  const setRowFields = (
    rowIndex: number,
    fields: Partial<Omit<MarketRow, "id" | "symbol" | "venue">>,
  ): void => {
    const row = rows[rowIndex] as MutableMarketRow | undefined;
    if (!row) {
      return;
    }

    if (fields.price !== undefined) {
      row.price = fields.price;
    }
    if (fields.change !== undefined) {
      row.change = fields.change;
    }
    if (fields.volume !== undefined) {
      row.volume = fields.volume;
    }
    if (fields.trades !== undefined) {
      row.trades = fields.trades;
    }
    if (fields.heat !== undefined) {
      row.heat = fields.heat;
    }
    if (fields.focused !== undefined) {
      row.focused = fields.focused;
    }
  };

  const mutateRowAtIndex = (rowIndex: number): void => {
    const row = rows[rowIndex] as MarketRow | undefined;
    if (!row) {
      return;
    }

    setRowFields(rowIndex, mutateRowFields(row));
  };

  const stormRowAtIndex = (rowIndex: number): void => {
    const row = rows[rowIndex] as MarketRow | undefined;
    if (!row) {
      return;
    }

    setRowFields(rowIndex, stormRowFields(row));
  };

  const focusNextRow = (): void => {
    const nextFocusedId = (focusedRowId.value + 1) % rows.length;
    focusRow(nextFocusedId);
  };

  const focusRow = (rowId: number): void => {
    if (rowId === focusedRowId.value) {
      return;
    }

    const previousRow = rows[focusedRowId.value] as
      | MutableMarketRow
      | undefined;
    const nextRow = rows[rowId] as MutableMarketRow | undefined;

    if (!previousRow || !nextRow) {
      return;
    }

    previousRow.focused = false;
    nextRow.focused = true;
    focusedRowId.value = rowId;
  };

  return {
    rows,
    metrics,
    focusedRowId,
    focusRow,
    setRowFields,
    mutateRowAtIndex,
    stormRowAtIndex,
    focusNextRow,
  };
}

export async function fetchMarketRows(
  requestedRowCount: number,
): Promise<MarketRow[]> {
  const response = await fetch(
    `/api/market?rows=${requestedRowCount.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load market rows: ${response.status}`);
  }

  const payload = (await response.json()) as { rows?: MarketRow[] };
  if (!Array.isArray(payload.rows)) {
    throw new Error("Backend response did not include rows.");
  }

  return payload.rows;
}
