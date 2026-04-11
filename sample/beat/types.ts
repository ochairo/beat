import type { Pulse } from "@ochairo/pulse";

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

export interface DemoState {
  readonly metrics: DemoMetrics;
  readonly rows: MarketRow[];
  readonly focusedRowId: number;
}

export type SurfaceMode = "table" | "cards" | "editor";
export type Mode = "batched" | "single";

export interface BenchmarkTiming {
  readonly writeMs: number;
  readonly visualMs: number;
  readonly totalMs: number;
}

export type RootPulse<TValue> = Pulse<TValue> & {
  batch<TResult>(callback: () => TResult): TResult;
};

export type RowClassState = {
  baseClassName: string;
  focused: boolean;
  heatWidth: string;
  positiveChange: boolean;
};

export interface SurfaceCopy {
  readonly title: string;
  readonly subtitle: string;
}

export interface FactItem {
  readonly headline: string;
  readonly detail: string;
}
