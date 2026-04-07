export interface MarketRow {
  readonly id: number;
  readonly symbol: string;
  readonly venue: string;
  readonly price: number;
  readonly volume: number;
  readonly change: number;
  readonly trades: number;
  readonly heat: number;
  readonly focused: boolean;
}

export interface DemoMetrics {
  readonly lastDurationMs: number;
  readonly lastVisualMs: number;
  readonly lastTotalMs: number;
  readonly bestTotalMs: number;
  readonly averageTotalMs: number;
  readonly totalWrites: number;
  readonly operationsRun: number;
  readonly lastMode: string;
  readonly status: string;
}

export type Mode = "batched" | "unbatched";
export type SurfaceMode = "table" | "cards" | "editor";

export interface BenchmarkTiming {
  readonly writeMs: number;
  readonly visualMs: number;
  readonly totalMs: number;
}

export interface SurfaceCopy {
  readonly title: string;
  readonly subtitle: string;
}

export interface NoteItem {
  readonly title: string;
  readonly description: string;
}

export interface FactItem {
  readonly headline: string;
  readonly detail: string;
}

export type MutableMarketRow = {
  -readonly [TKey in keyof MarketRow]: MarketRow[TKey];
};

export interface FocusedRowState {
  value: number;
}

export interface MarketModel {
  readonly rows: MutableMarketRow[];
  readonly metrics: DemoMetrics;
  readonly focusedRowId: FocusedRowState;
  focusRow(rowId: number): void;
  setRowFields(
    rowIndex: number,
    fields: Partial<Omit<MarketRow, "id" | "symbol" | "venue">>,
  ): void;
  mutateRowAtIndex(rowIndex: number): void;
  stormRowAtIndex(rowIndex: number): void;
  focusNextRow(): void;
}
