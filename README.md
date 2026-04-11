<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

<h1>
  <img src="./docs/images/beat-brand-dot.gif" alt="Beat brand dot" width="30" height="30" style="vertical-align: -5px;"> beat
</h1>

[Pulse](https://github.com/ochairo/pulse?tab=readme-ov-file#-pulse) native JSX for direct-DOM SPA applications.<br>
_Fine-grained rendering, explicit routing, explicit async state._

</div>

## Concept

`beat` is a [Pulse](https://github.com/ochairo/pulse?tab=readme-ov-file#-pulse) native framework for client-rendered web apps.<br>
It keeps state explicit with [Pulse](https://github.com/ochairo/pulse?tab=readme-ov-file#-pulse), renders directly to the DOM, and provides explicit JSX, routing, and async primitives.

## Scaffold

Start a new app with the scaffolder:

```sh
pnpm create @ochairo/create-beat my-app
```

That command scaffolds a Vite + TypeScript starter already configured for Beat's JSX runtime and Vite plugin.

For the router starter:

```sh
pnpm create @ochairo/create-beat my-app --template router
```

## Quick Start

Default starter app:

```tsx
import { bindText, component } from "@ochairo/beat";
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
        <strong class="result">{bindText(counter)}</strong>
        <button class="button" onClick={() => onclick(1)}>
          +
        </button>
      </section>
    </main>
  );
});
```

## Documentation

- [Getting Started](./docs/GETTING_STARTED.md)
- [Existing App Setup](./docs/EXISTING_APP.md)
- [Motivation](./docs/MOTIVATION.md)
- [API](./docs/API.md)
- [Compiler Contract](./docs/COMPILER.md)
- [Support Policy](./docs/SUPPORT.md)

<br>

<div align="center">

[Report Bug](https://github.com/ochairo/beat/issues) • [Request Feature](https://github.com/ochairo/beat/issues)

</div>
