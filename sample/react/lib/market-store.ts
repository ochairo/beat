import { useSyncExternalStore } from "react";
import { createInitialMetrics } from "./metrics.js";
import type {
  DemoMetrics,
  Listener,
  MarketRow,
  MarketStore,
} from "../types.js";

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

function mutateRowValue(row: MarketRow): MarketRow {
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
    ...row,
    price: nextPrice,
    change: nextChange,
    volume: nextVolume,
    trades: nextTrades,
    heat: nextHeat,
  };
}

function stormRowValue(row: MarketRow): MarketRow {
  const drift = roundTo((nextRandom() - 0.5) * 0.9, 2);

  return {
    ...row,
    price: roundTo(row.price + drift, 2),
    change: roundTo(row.change + drift * 0.55, 2),
    heat: clamp(row.heat + Math.floor((nextRandom() - 0.45) * 12), 4, 100),
  };
}

function createListenerStore(): {
  subscribe(listener: Listener): () => void;
  notify(): void;
} {
  const listeners = new Set<Listener>();

  return {
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify(): void {
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

export function createMarketStore(
  initialRows: readonly MarketRow[],
): MarketStore {
  const rows = [...initialRows];
  const rowIds = rows.map((row) => row.id);
  const rowIndexById = new Map(rows.map((row, index) => [row.id, index]));
  const rowListeners = new Map<number, ReturnType<typeof createListenerStore>>(
    rowIds.map((rowId) => [rowId, createListenerStore()]),
  );
  const metricsListeners = createListenerStore();
  const focusedRowListeners = createListenerStore();
  let metrics = createInitialMetrics(
    "Ready. React is subscribing row by row through useSyncExternalStore.",
  );
  let focusedRowId = 0;
  let isBatching = false;
  let focusedRowChanged = false;
  const dirtyRowIds = new Set<number>();

  const notifyRow = (rowId: number): void => {
    rowListeners.get(rowId)?.notify();
  };

  const markRowDirty = (rowId: number): void => {
    if (isBatching) {
      dirtyRowIds.add(rowId);
      return;
    }

    notifyRow(rowId);
  };

  const flush = (): void => {
    for (const rowId of dirtyRowIds) {
      notifyRow(rowId);
    }
    dirtyRowIds.clear();

    if (focusedRowChanged) {
      focusedRowListeners.notify();
      focusedRowChanged = false;
    }
  };

  return {
    rowIds,
    getRow(rowId: number): MarketRow {
      const rowIndex = rowIndexById.get(rowId);
      if (rowIndex === undefined) {
        throw new Error(`Unknown row ${rowId}`);
      }

      const row = rows[rowIndex];
      if (!row) {
        throw new Error(`Missing row ${rowId}`);
      }

      return row;
    },
    subscribeRow(rowId: number, listener: Listener): () => void {
      const rowStore = rowListeners.get(rowId);
      if (!rowStore) {
        throw new Error(`Unknown row ${rowId}`);
      }

      return rowStore.subscribe(listener);
    },
    getMetrics(): DemoMetrics {
      return metrics;
    },
    subscribeMetrics(listener: Listener): () => void {
      return metricsListeners.subscribe(listener);
    },
    getFocusedRowId(): number {
      return focusedRowId;
    },
    subscribeFocusedRowId(listener: Listener): () => void {
      return focusedRowListeners.subscribe(listener);
    },
    batch(callback: () => void): void {
      if (isBatching) {
        callback();
        return;
      }

      isBatching = true;
      try {
        callback();
      } finally {
        isBatching = false;
        flush();
      }
    },
    focusRow(rowId: number): void {
      if (rowId === focusedRowId) {
        return;
      }

      const previousRowIndex = rowIndexById.get(focusedRowId);
      const nextRowIndex = rowIndexById.get(rowId);

      if (previousRowIndex !== undefined) {
        const previousRow = rows[previousRowIndex];
        if (previousRow) {
          rows[previousRowIndex] = { ...previousRow, focused: false };
          markRowDirty(previousRow.id);
        }
      }

      if (nextRowIndex !== undefined) {
        const nextRow = rows[nextRowIndex];
        if (nextRow) {
          rows[nextRowIndex] = { ...nextRow, focused: true };
          markRowDirty(nextRow.id);
          focusedRowId = rowId;
          if (isBatching) {
            focusedRowChanged = true;
          } else {
            focusedRowListeners.notify();
          }
        }
      }
    },
    mutateRow(rowId: number): void {
      const rowIndex = rowIndexById.get(rowId);
      if (rowIndex === undefined) {
        return;
      }

      const row = rows[rowIndex];
      if (!row) {
        return;
      }

      rows[rowIndex] = mutateRowValue(row);
      markRowDirty(rowId);
    },
    stormRow(rowId: number): void {
      const rowIndex = rowIndexById.get(rowId);
      if (rowIndex === undefined) {
        return;
      }

      const row = rows[rowIndex];
      if (!row) {
        return;
      }

      rows[rowIndex] = stormRowValue(row);
      markRowDirty(rowId);
    },
    moveFocus(): void {
      const nextFocusedRowId = (focusedRowId + 1) % rows.length;
      this.focusRow(nextFocusedRowId);
    },
    updateMetrics(updater: (previous: DemoMetrics) => DemoMetrics): void {
      metrics = updater(metrics);
      metricsListeners.notify();
    },
  };
}

export function useRow(store: MarketStore, rowId: number): MarketRow {
  return useSyncExternalStore(
    (listener) => store.subscribeRow(rowId, listener),
    () => store.getRow(rowId),
    () => store.getRow(rowId),
  );
}

export function useMetrics(store: MarketStore): DemoMetrics {
  return useSyncExternalStore(
    (listener) => store.subscribeMetrics(listener),
    () => store.getMetrics(),
    () => store.getMetrics(),
  );
}

export function useFocusedRowId(store: MarketStore): number {
  return useSyncExternalStore(
    (listener) => store.subscribeFocusedRowId(listener),
    () => store.getFocusedRowId(),
    () => store.getFocusedRowId(),
  );
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
