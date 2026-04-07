import { type BeatCleanup } from "./dom.js";
import { toRendered, type BeatJsxChild } from "./jsx-runtime.js";

const noop = (): void => {};

export interface BeatRoot {
  readonly target: Element;
  readonly mounted: boolean;
  render(view: BeatJsxChild): void;
  destroy(): void;
}

export function createRoot(target: Element): BeatRoot {
  let cleanupCurrentView: BeatCleanup = noop;
  let mounted = false;

  const disposeCurrentView = (): void => {
    cleanupCurrentView();
    cleanupCurrentView = noop;
    target.replaceChildren();
    mounted = false;
  };

  return {
    target,
    get mounted(): boolean {
      return mounted;
    },
    render(view: BeatJsxChild): void {
      disposeCurrentView();

      const rendered = toRendered(view);
      target.append(rendered.node);
      cleanupCurrentView = rendered.cleanup ?? noop;
      mounted = true;
    },
    destroy(): void {
      disposeCurrentView();
    },
  };
}

export function render(target: Element, view: BeatJsxChild): BeatCleanup {
  const root = createRoot(target);
  root.render(view);
  return () => {
    root.destroy();
  };
}
