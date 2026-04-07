import type { Pulse } from "@ochairo/pulse";

export type BeatRootState<TRootState> = Pulse<TRootState> & {
  batch<TResult>(callback: () => TResult): TResult;
};

export interface BeatMountContext<TRootState> {
  readonly state: BeatRootState<TRootState>;
  readonly target: Element;
}

export type BeatDispose = () => void;

export interface CreateBeatAppOptions<TRootState> {
  readonly state: BeatRootState<TRootState>;
  readonly mount: (context: BeatMountContext<TRootState>) => void | BeatDispose;
}

export interface BeatApp<TRootState> {
  readonly state: BeatRootState<TRootState>;
  readonly mounted: boolean;
  mount(target: Element): void;
  destroy(): void;
}

export function createApp<TRootState>(
  options: CreateBeatAppOptions<TRootState>,
): BeatApp<TRootState> {
  let currentTarget: Element | undefined;
  let disposeCurrentMount: BeatDispose | undefined;

  return {
    state: options.state,
    get mounted(): boolean {
      return currentTarget !== undefined;
    },
    mount(target: Element): void {
      if (currentTarget === target) {
        return;
      }

      if (currentTarget) {
        disposeCurrentMount?.();
      }

      currentTarget = target;

      const dispose = options.mount({
        state: options.state,
        target,
      });

      disposeCurrentMount = typeof dispose === "function" ? dispose : undefined;
    },
    destroy(): void {
      disposeCurrentMount?.();
      disposeCurrentMount = undefined;
      currentTarget = undefined;
    },
  };
}
