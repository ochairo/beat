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

/**
 * Attaches a Beat view to a server-rendered `target` using **replace
 * hydration**: the view is fully rendered into detached nodes first, then
 * swapped into the target in a single `replaceChildren` call.
 *
 * This means the server HTML remains visible in the browser while the
 * client bundle loads and executes — the swap is instantaneous and leaves
 * no blank intermediate frame.
 *
 * @example
 * ```ts
 * // entry-client.ts
 * import { createRouter } from "@ochairo/beat";
 * import { hydrate } from "@ochairo/beat";
 *
 * const router = createRouter({ routes, window });
 * hydrate(document.getElementById("app")!, <App router={router} />);
 * ```
 */
export function hydrate(target: Element, view: BeatJsxChild): BeatCleanup {
  const rendered = toRendered(view);
  // Single atomic swap — server HTML → live Beat tree, no blank frame.
  target.replaceChildren(rendered.node);
  return () => {
    rendered.cleanup?.();
    target.replaceChildren();
  };
}
