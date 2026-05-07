import { enterSsr, exitSsr } from "./ssr-context.js";
import { toRendered, type BeatJsxChild } from "./jsx-runtime.js";
import type { BeatRouter } from "./router.js";

/**
 * Renders a Beat JSX tree to an HTML string.
 *
 * `onMount` callbacks are suppressed during rendering — they will not fire
 * against the server-side DOM.
 *
 * Requires a DOM environment (`globalThis.document`) to be installed before
 * calling — use happy-dom or jsdom in your server entry point.
 *
 * Pair with `createRouter({ initialUrl })` so the router resolves the correct
 * route without trying to read `window.location`. For routes with `load`
 * functions, await `waitForRouter(router)` before calling this.
 *
 * @example
 * ```ts
 * // entry-server.ts
 * import { Window } from "happy-dom";
 * import { createRouter } from "@ochairo/beat";
 * import { renderToString, waitForRouter } from "@ochairo/beat/server";
 *
 * export async function render(url: string): Promise<string> {
 *   const win = new Window({ url });
 *   globalThis.document = win.document as unknown as Document;
 *
 *   const router = createRouter({ routes, initialUrl: url });
 *   await waitForRouter(router);
 *   const html = renderToString(() => <App router={router} />);
 *
 *   win.happyDOM.close();
 *   return html;
 * }
 * ```
 */
export function renderToString(factory: () => BeatJsxChild): string {
  enterSsr();
  try {
    const container = document.createElement("div");
    const rendered = toRendered(factory());
    container.append(rendered.node);
    const html = container.innerHTML;
    rendered.cleanup?.();
    return html;
  } finally {
    exitSsr();
  }
}

/**
 * Waits for all `load` functions of the currently matched routes to settle.
 *
 * Use this before `renderToString` when your routes have `load` functions so
 * that the rendered HTML contains the loaded data rather than empty/pending
 * state.
 *
 * Pass an `AbortSignal` (e.g. from `AbortSignal.timeout(5000)`) so the
 * promise rejects instead of hanging if loaders never settle — for example
 * when the router is disposed or a loader stalls.
 *
 * @example
 * ```ts
 * const router = createRouter({ routes, initialUrl: url });
 * await waitForRouter(router, { signal: AbortSignal.timeout(5000) });
 * const html = renderToString(() => <App router={router} />);
 * ```
 */
export function waitForRouter(
  router: BeatRouter,
  options?: { readonly signal?: AbortSignal },
): Promise<void> {
  if (!router.current.get().loading) {
    return Promise.resolve();
  }

  const signal = options?.signal;

  if (signal?.aborted) {
    return Promise.reject(signal.reason);
  }

  return new Promise<void>((resolve, reject) => {
    const unsubscribe = router.current.on((event) => {
      if (!event.currentValue.loading) {
        cleanup();
        resolve();
      }
    });

    const onAbort = (): void => {
      cleanup();
      reject(signal!.reason);
    };

    const cleanup = (): void => {
      unsubscribe();
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort);
  });
}
