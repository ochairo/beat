import { enterSsr, exitSsr } from "./ssr-context.js";
import { toRendered, type BeatJsxChild } from "./jsx-runtime.js";
import type { BeatRouter } from "./router.js";

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const RAW_TEXT_ELEMENTS = new Set([
  "script", "style", "xmp", "iframe", "noembed", "noframes", "noscript",
]);

/** Rejects text trees whose HTML serialization could become active markup. */
function validateSerialization(node: Node, restrictedContext = false): void {
  if (node.nodeType !== 1) {
    for (const child of node.childNodes) validateSerialization(child, restrictedContext);
    return;
  }
  const element = node as Element;
  const tag = element.localName.toLowerCase();
  const html = element.namespaceURI === HTML_NAMESPACE;
  const restricted = restrictedContext || !html ||
    tag === "svg" || tag === "math" || tag === "select" || tag === "frameset";

  if (html && tag === "plaintext") {
    throw new TypeError("Beat SSR cannot safely serialize <plaintext>.");
  }
  if (html && (RAW_TEXT_ELEMENTS.has(tag) || tag === "textarea" || tag === "title")) {
    if (Array.from(element.childNodes).some((child) => child.nodeType !== 3)) {
      throw new TypeError(`Beat SSR requires text-only children in <${tag}>.`);
    }
    if (RAW_TEXT_ELEMENTS.has(tag) && (restricted || (element.textContent ?? "").includes("<"))) {
      throw new TypeError(
        `Beat SSR cannot safely serialize <${tag}> in this context or with '<' in its text. Use an external script/style or escape '<' in serialized string data.`,
      );
    }
  }
  for (const child of element.childNodes) validateSerialization(child, restricted);
  if (html && tag === "template" && "content" in element) {
    validateSerialization((element as HTMLTemplateElement).content, restricted);
  }
}

/**
 * Renders a Beat JSX tree to an HTML string.
 *
 * `onMount` callbacks are suppressed during rendering — they will not fire
 * against the server-side DOM.
 *
 * Requires matching DOM globals (document, Node, HTMLElement, SVGElement, and
 * DocumentFragment) during synchronous rendering; see the happy-dom example below.
 *
 * Pair with `createRouter({ initialUrl })` so the router resolves the correct
 * route without trying to read `window.location`. For routes with `load`
 * functions, await `waitForRouter(router)` before calling this.
 *
 * Raw-text elements (including script/style) require text-only children without
 * '<', and cannot appear in foreign, select, or frameset contexts. Use external
 * scripts/styles for code containing '<'; encode '<' as '\\u003c' only inside
 * serialized JavaScript string data. textarea/title also require text children;
 * plaintext is unsupported. This is not a sanitizer for trusted DOM attributes
 * or intentionally executable JavaScript/CSS.
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
 *   const router = createRouter({ routes, initialUrl: url });
 *   try {
 *     await waitForRouter(router, { signal: AbortSignal.timeout(5_000) });
 *     const previousGlobals = {
 *       document: globalThis.document, Node: globalThis.Node,
 *       HTMLElement: globalThis.HTMLElement, SVGElement: globalThis.SVGElement,
 *       DocumentFragment: globalThis.DocumentFragment,
 *     };
 *     Object.assign(globalThis, {
 *       document: win.document, Node: win.Node,
 *       HTMLElement: win.HTMLElement, SVGElement: win.SVGElement,
 *       DocumentFragment: win.DocumentFragment,
 *     });
 *     try {
 *       return renderToString(() => <App router={router} />);
 *     } finally {
 *       Object.assign(globalThis, previousGlobals);
 *     }
 *   } finally {
 *     router.dispose();
 *     await win.happyDOM.close();
 *   }
 * }
 * ```
 */
export function renderToString(factory: () => BeatJsxChild): string {
  enterSsr();
  try {
    const container = document.createElement("div");
    const rendered = toRendered(factory());
    try {
      container.append(rendered.node);
      validateSerialization(container);
      return container.innerHTML;
    } finally {
      rendered.cleanup?.();
    }
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
