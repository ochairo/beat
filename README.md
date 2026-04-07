<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# ◉ beat

Pulse-native JSX for direct-DOM SPA applications.<br>
_Fine-grained rendering, explicit routing, explicit async state._

Pre-beta release line: `0.2.x`.

</div>

## Concept

`beat` is a Pulse-native UI framework for client-rendered web applications.
It keeps state explicit through `@ochairo/pulse`, renders directly to the DOM, and adds framework primitives for JSX, routing, and async resources without switching to a component rerender-by-default model.

Current framework primitives include:

- JSX runtime with `Show`, `For`, `component`, and `onCleanup`
- direct-DOM rendering through `createRoot()` and `render()`
- SPA routing with guards, loaders, named outlets, reload, and prefetch
- explicit async resources with debounce, stale-while-refresh, and shared caches

Beat is no longer a `0.0.x` prototype, but it is still pre-`1.0.0`.
The current `0.2.x` line should be treated as experimental and suitable for framework development, internal apps, and early adopters who can tolerate API movement.

## Install

```sh
pnpm add @ochairo/beat @ochairo/pulse
```

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
- [API](./docs/API.md)
- [Compiler Contract](./docs/COMPILER.md)
- [Benchmark Methodology](./docs/BENCHMARKS.md)
- [Support Policy](./docs/SUPPORT.md)

<br>

<div align="center">

[Report Bug](https://github.com/ochairo/beat/issues) • [Request Feature](https://github.com/ochairo/beat/issues)

</div>
