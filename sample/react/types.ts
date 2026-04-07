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

export type Listener = () => void;

export interface MarketStore {
  readonly rowIds: readonly number[];
  getRow(rowId: number): MarketRow;
  subscribeRow(rowId: number, listener: Listener): () => void;
  getMetrics(): DemoMetrics;
  subscribeMetrics(listener: Listener): () => void;
  getFocusedRowId(): number;
  subscribeFocusedRowId(listener: Listener): () => void;
  batch(callback: () => void): void;
  focusRow(rowId: number): void;
  mutateRow(rowId: number): void;
  stormRow(rowId: number): void;
  moveFocus(): void;
  updateMetrics(updater: (previous: DemoMetrics) => DemoMetrics): void;
}
