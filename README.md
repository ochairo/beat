<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

<h1>beat</h1>

JSX framework built on [Pulse](https://github.com/ochairo/pulse?tab=readme-ov-file#-pulse) for predictable apps with local updates.<br>
_Run-once components, local updates, explicit routing, async resources, and SSR._

[![npm version](https://img.shields.io/npm/v/@ochairo/beat)](https://www.npmjs.com/package/@ochairo/beat)
[![npm downloads](https://img.shields.io/npm/dm/@ochairo/beat)](https://www.npmjs.com/package/@ochairo/beat)
![CI](https://github.com/ochairo/beat/workflows/validate/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue)

[Documentation](https://ochairo.github.io/beat-site/)

</div>

## Overview

Beat is built for apps that should stay understandable as they grow.
The public model stays explicit:

- **Run-once components** — a component behaves like setup code, not a rerender loop
- **Local updates** — Pulse exact-path subscriptions update only the binding that depends on the changed value
- **Explicit router and resources** — routing state and async state stay in normal userland APIs
- **Shared client/server model** — the same component tree and router power rendering, hydration, and SSR

## Upgrading to 2.0.0

Node.js consumers now require Node 24.22.1 or later within the 24.x line, or
Node 26.12.1 or later. Beat now depends on Pulse 2; update direct
`@ochairo/pulse` dependencies to `^2.0.0` as well.
The Vite plugin declares Vite `^7.3.7 || ^8.3.5` as an optional peer and includes
its TypeScript compiler dependency. Runtime-only applications do not need Vite.

Route guards now cover initial URLs, parents, named branches, and prefetch reuse.
Update exhaustive `BeatRouteErrorPhase` switches to handle `"guard"`.
SSR rejects unsafe raw-text contexts and literal `<` in raw-text content;
follow the [SSR security boundaries](#ssr-security-boundaries) when migrating
inline scripts, styles, or serialized data.

## Scaffold

Start a new app with the scaffolder:

```sh
pnpm dlx @ochairo/beat-create my-app
```

Use the `showcases` template for a full-featured app with routing, crypto dashboard, kanban board, and spreadsheet:

```sh
pnpm dlx @ochairo/beat-create my-app --template showcases
```

That command scaffolds a Vite + TypeScript starter already configured for Beat's JSX runtime and Vite plugin.

## Example

```tsx
import { component } from "@ochairo/beat";
import { pulse } from "@ochairo/pulse";

const counter = pulse(0);

const onclick = (value) => {
  counter.set(counter.get() + value);
};

export const App = component(() => {
  return (
    <main>
      <header class="header">
        <h1 class="title">Counter app</h1>
      </header>
      <section class="counter">
        <button class="button" onClick={() => onclick(-1)}>
          -
        </button>
        <strong class="result">{counter}</strong>
        <button class="button" onClick={() => onclick(1)}>
          +
        </button>
      </section>
    </main>
  );
});
```

## Server-Side Rendering

Beat's SSR uses the same component tree and router — two entry points, no new framework.

```ts
// entry-server.ts
import { Window } from "happy-dom";
import { createRouter } from "@ochairo/beat";
import { renderToString, waitForRouter } from "@ochairo/beat/server";

export async function render(url: string): Promise<string> {
  const win = new Window({ url });
  const router = createRouter({ routes, initialUrl: url });
  try {
    await waitForRouter(router, { signal: AbortSignal.timeout(5_000) });
    const previousGlobals = {
      document: globalThis.document, Node: globalThis.Node,
      HTMLElement: globalThis.HTMLElement, SVGElement: globalThis.SVGElement,
      DocumentFragment: globalThis.DocumentFragment,
    };
    Object.assign(globalThis, {
      document: win.document, Node: win.Node,
      HTMLElement: win.HTMLElement, SVGElement: win.SVGElement,
      DocumentFragment: win.DocumentFragment,
    });
    try {
      const html = renderToString(() => <App router={router} />);
      return `<div id="app">${html}</div>`;
    } finally {
      Object.assign(globalThis, previousGlobals);
    }
  } finally {
    router.dispose();
    await win.happyDOM.close();
  }
}

// entry-client.ts
import { createRouter, hydrate } from "@ochairo/beat";

const router = createRouter({ routes, window });
hydrate(document.getElementById("app")!, <App router={router} />);
```

- `initialUrl` — resolves the route on the server without reading `window.location`
- `waitForRouter` — waits for route loaders to settle before rendering; accepts `AbortSignal`
- `renderToString` — takes a factory `() => JSX`; suppresses `onMount` on the server
- `hydrate` — single atomic swap from server HTML to live Beat tree, no blank frame

### SSR security boundaries

`renderToString` rejects raw-text elements (`script`, `style`, `xmp`, `iframe`,
`noembed`, `noframes`, and `noscript`) whose text contains `<`, whose children are
not text, or which appear inside foreign content, `select`, or `frameset`.
`textarea` and `title` also require text-only children; `plaintext` is unsupported.
Validation includes template content, and rejection still disposes the rendered tree.

Use external scripts/styles for code containing `<` (including JavaScript comparisons).
For JSON embedded in a script data block, encode `<` in the serialized string as
`\u003c`. Do not substitute that escape for a JavaScript operator. Ordinary text
keeps native HTML escaping. This boundary does not sanitize caller-supplied DOM
attributes, executable URLs, JavaScript, CSS, or explicitly assigned HTML.

Install a request's matching DOM globals only during synchronous rendering, after
awaiting loaders, and restore the previous globals in `finally`. `document` alone
is insufficient: Beat also uses the DOM constructors shown above. Do not share
mutable request DOM globals across asynchronous work. Dispose each request's router and DOM.

### Route guard admission

Guards run from parent to child on the main branch, then on matched named branches,
before loaders, prefetch, history changes, or rendering. A rejected initial URL has
an empty matched branch. Redirects restart admission for the new destination.
Guard `to.route` and `to.depth` identify the owning route; parameters retain the
main matched route's parameter mapping. Malformed encoded parameters match no route.

Guards control client navigation and SSR rendering; backend data access still needs
authorization. Invalidate prefetch data when the authenticated identity changes.

`invalidatePrefetch()` cancels all prefetches. With a URL it invalidates that
canonical key directly, without running guards or redirects. After prefetching a
redirecting alias, invalidate its destination or invalidate everything. Canceling
a navigation waiting on prefetch immediately settles it as unmatched and not
loading, even if its loader ignores abort. Navigate or reload to try again.
Prefetch completion rechecks guards before publishing data or restarting loads.
Disposal cancels work and makes subsequent navigation methods inert.

If admission throws while resuming a pending prefetch navigation, the router
settles unmatched and reports `onError` with `phase: "guard"`. This adds `"guard"`
to `BeatRouteErrorPhase`; update exhaustive phase switches when upgrading.
Synchronous `navigate`/`prefetch` guard exceptions still propagate to the caller.
Application `onError` callbacks must not throw.
