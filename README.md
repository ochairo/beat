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
  globalThis.document = win.document as unknown as Document;

  const router = createRouter({ routes, initialUrl: url });
  await waitForRouter(router, { signal: AbortSignal.timeout(5_000) });
  const html = renderToString(() => <App router={router} />);

  win.happyDOM.close();
  return `<div id="app">${html}</div>`;
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
