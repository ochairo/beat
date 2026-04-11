<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

<h1>
  <img src="./docs/images/beat-brand-dot.gif" alt="Beat brand dot" width="30" height="30" style="vertical-align: -5px;"> beat
</h1>

Pulse-native JSX for direct-DOM SPA applications.<br>
_Fine-grained rendering, explicit routing, explicit async state._

</div>

## Concept

`beat` is a Pulse-native UI framework for client-rendered web applications.
It keeps state explicit through `@ochairo/pulse`, renders directly to the DOM, and adds framework primitives for JSX, routing, and async resources without switching to a component rerender-by-default model.

Current framework primitives include:

- JSX runtime with `Show`, `For`, `component`, and `onCleanup`
- direct-DOM rendering through `createRoot()` and `render()`
- SPA routing with guards, loaders, named outlets, reload, and prefetch
- explicit async resources with debounce, stale-while-refresh, and shared caches

## Install

```sh
pnpm add @ochairo/beat @ochairo/pulse
```

## Scaffold

```sh
pnpm create @ochairo/beat my-app
```

That command scaffolds a Vite + TypeScript starter already configured for Beat's JSX runtime and Vite plugin.

## Quick Start

```tsx
import { pulse } from "@ochairo/pulse";
import { For, createRoot } from "@ochairo/beat";

const count = pulse(0);
const items = pulse(["tea", "coffee"]);

const app = (
  <main>
    <h1>Beat</h1>
    <button onClick={() => count.set(count.get() + 1)}>
      count: {count}
    </button>
    <ul>
      <For each={items}>
        {(item) => <li>{item}</li>}
      </For>
    </ul>
  </main>
);

createRoot(document.getElementById("app")!).render(app);
```

## Vite Setup

```ts
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  plugins: [createBeatVitePlugin()],
});
```

TypeScript:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ochairo/beat"
  }
}
```

## Documentation

- [Getting Started](./docs/GETTING_STARTED.md)
- [Motivation](./docs/MOTIVATION.md)
- [API](./docs/API.md)
- [Compiler Contract](./docs/COMPILER.md)
- [Support Policy](./docs/SUPPORT.md)

<br>

<div align="center">

[Report Bug](https://github.com/ochairo/beat/issues) • [Request Feature](https://github.com/ochairo/beat/issues)

</div>
