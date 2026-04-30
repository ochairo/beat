<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

<h1>beat</h1>

[Pulse](https://github.com/ochairo/pulse?tab=readme-ov-file#-pulse)-native JSX framework for direct-DOM client-rendered SPA applications.<br>
_Fine-grained rendering with explicit routing and async primitives._

[![npm version](https://img.shields.io/npm/v/@ochairo/beat)](https://www.npmjs.com/package/@ochairo/beat)
[![npm downloads](https://img.shields.io/npm/dm/@ochairo/beat)](https://www.npmjs.com/package/@ochairo/beat)
![CI](https://github.com/ochairo/beat/workflows/validate/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue)

[Documentation](https://ochairo.github.io/beat-site/)

</div>

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
