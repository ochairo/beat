# Beat Getting Started

This guide walks through a small Beat application using:

- Pulse state
- Beat JSX rendering
- router navigation
- route prefetch
- explicit async resources

This guide reflects the recommended Beat `1.1.x` usage model.

## 1. Scaffold A New App

Fastest path:

```sh
pnpm dlx @ochairo/beat-create my-app
```

For the showcases starter:

```sh
pnpm dlx @ochairo/beat-create my-app --template showcases
```

If you want to wire Beat into an existing app manually, use [Existing App Setup](./EXISTING_APP.md).

## 2. Configure TypeScript

Set Beat as the JSX import source.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ochairo/beat"
  }
}
```

## 3. Configure Vite

```ts
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  plugins: [createBeatVitePlugin()],
});
```

## 4. Create A Small App

```tsx
import { pulse } from "@ochairo/pulse";
import {
  For,
  Link,
  Outlet,
  Show,
  component,
  createResource,
  createRoot,
  createRouter,
  onCleanup,
} from "@ochairo/beat";

const counter = pulse(0);
const todos = pulse(["ship docs", "stabilize router"]);

const router = createRouter({
  routes: [
    {
      path: "/",
      view() {
        return <HomePage />;
      },
    },
    {
      path: "/about",
      async load() {
        return "About Beat";
      },
      view(match) {
        return <section>{match.data ?? "loading"}</section>;
      },
    },
  ],
});

const SearchPanel = component(() => {
  const query = pulse("beat");
  const resource = createResource({
    source: query,
    immediate: false,
    getCacheKey(value) {
      return value;
    },
    load: async (value) => `results:${value}`,
  });

  onCleanup(() => {
    resource.dispose();
  });

  return (
    <section>
      <button onClick={() => query.set("router")}>Change Query</button>
      <button onClick={() => void resource.reload()}>Reload Search</button>
      <div>status: {resource.state.status}</div>
      <div>data: {resource.state.data}</div>
    </section>
  );
});

const HomePage = component(() => {
  return (
    <main>
      <h1>Beat</h1>
      <button onClick={() => counter.set(counter.get() + 1)}>
        count: {counter}
      </button>

      <Show when={counter} fallback={<p>counter is zero</p>}>
        <p>counter is active</p>
      </Show>

      <ul>
        <For each={todos}>
          {(todo) => <li>{todo}</li>}
        </For>
      </ul>

      <nav>
        <Link router={router} to="/about" prefetch="hover">
          About
        </Link>
      </nav>

      <SearchPanel />
    </main>
  );
});

createRoot(document.getElementById("app")!).render(<Outlet router={router} />);
```

## 5. What This Shows

This example demonstrates Beat's intended model:

- state stays in Pulse values
- JSX renders directly to DOM nodes
- `Show` and `For` are explicit rendering primitives
- `Link` can warm a route with `prefetch="hover"`
- route loaders keep their state on `match.data`, `match.loading`, and `match.error`
- resources keep async state explicit instead of hiding it behind Suspense-like control flow

## 6. Mental Model Notes

A few Beat-specific details matter:

- Beat assumes Pulse's authentic exact-path runtime contract; use real `pulse(...)` nodes, not lookalike objects with `get()`/`on()` methods
- `For` passes a `Pulse<T>` item, not a plain value
- exact-path child updates stay local, so updating one `For` item field should not remount sibling entries
- `createResource()` returns explicit state and cleanup, so component-owned resources should be disposed with `onCleanup()`
- `router.reload()` reruns the current route loaders
- `router.prefetch(to)` warms route data without changing history or current route state

## 7. Next Steps

After this guide, the most useful references are:

- [API](./API.md)
- [Compiler Contract](./COMPILER.md)
