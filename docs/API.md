# Beat API Reference

This document describes the current public API of `@ochairo/beat`.

This reference documents Beat's stable `1.1.x` contract for client-rendered SPA applications.
For compiler behavior and environment/versioning policy, see `docs/COMPILER.md`.

## Stability

Beat is currently in the `1.1.x` release line.

That means:

- the public API is stable within the documented client-rendered SPA scope
- breaking changes are reserved for future major versions
- minor releases should add features without breaking existing contracts
- patch releases should focus on fixes and non-breaking refinements

## Package Entry Points

Beat currently exposes these package entry points:

- `@ochairo/beat`
- `@ochairo/beat/jsx-runtime`
- `@ochairo/beat/jsx-dev-runtime`
- `@ochairo/beat/vite-plugin`

Use the main package for runtime, DOM, router, and resource APIs.
Use the JSX runtime subpaths through `jsxImportSource`.
Use the Vite plugin subpath for Beat-specific JSX lowering.

## Installation

```sh
pnpm add @ochairo/beat @ochairo/pulse
```

Beat currently expects:

- Node `>=24 <25`
- pnpm `>=10`

## Minimal JSX Setup

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ochairo/beat"
  }
}
```

Basic Vite setup:

```ts
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  plugins: [createBeatVitePlugin()],
});
```

## Mental Model

Beat is a Pulse-native framework.
It does not use component rerender-by-default as its main update model.

The intended model is:

- keep state in `@ochairo/pulse`
- rely on Pulse's exact-path semantics, where authentic Pulse nodes notify only the subscribed path unless you opt into broader behavior in Pulse itself
- bind DOM directly to pulse values or pulse-backed objects
- use JSX as authoring syntax, not as permission to rerender whole trees
- use explicit router and resource state instead of hidden framework state machines

## Core Runtime

### `createRoot(target)`

Create a Beat render root for a DOM element.

```ts
createRoot(target: Element): BeatRoot
```

`BeatRoot`:

```ts
interface BeatRoot {
  readonly target: Element;
  readonly mounted: boolean;
  render(view: BeatJsxChild): void;
  destroy(): void;
}
```

A root fully owns the currently mounted view.
Calling `render()` replaces the previous view and runs its cleanup.

### `render(target, view)`

Render a Beat view into an element and return a dispose function.

```ts
render(target: Element, view: BeatJsxChild): BeatCleanup
```

Use this when you want one-shot mounting without holding onto a root object.

## JSX Runtime

### `jsx`, `jsxs`, `jsxDEV`, `Fragment`

These functions and values back Beat's JSX transform.
In normal usage they are not called manually.
They are consumed by the TypeScript JSX runtime when `jsxImportSource` points to Beat.

### `component(setup)`

Create a scope-aware Beat component.

```ts
component<TProps>(setup: BeatComponent<TProps>): BeatComponent<TProps>
```

A Beat component behaves more like a setup function than a rerender function.
Its cleanup is tied to the owning render scope.

### `onCleanup(cleanup)`

Register cleanup work inside a Beat component scope.

```ts
onCleanup(cleanup: BeatCleanup): void
```

This must run inside `component(...)`.
It throws if used outside an active Beat component scope.

### `Show`

Conditional rendering primitive.

```ts
interface ShowProps<TValue> {
  readonly when: Pulse<TValue>;
  readonly children: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly fallback?: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly mapValue?: (value: TValue) => boolean;
}
```

Use `Show` for explicit mount/unmount branch behavior.

### `For`

Keyed collection rendering primitive.

```ts
interface ForProps<TValue> {
  readonly each: Pulse<readonly TValue[]>;
  readonly children: (value: Pulse<TValue>, index: number) => BeatJsxChild;
  readonly key?: (value: TValue, index: number) => PropertyKey;
}
```

`For` keeps a stable `Pulse<TValue>` per keyed entry. Exact-path writes like `rows[0].label.set(...)` update that entry in place and should not remount sibling entries.

Important behavior:

- each rendered item receives a stable `Pulse<TValue>` for the keyed item
- Beat reuses keyed entries where possible
- child-pulse field updates continue to flow through reused keyed entries without requiring structural array changes
- structural list changes remount only the entries that need to move or be created

### Shared JSX Types

Beat exports several shared JSX and component types:

- `BeatJsxChild`
- `BeatJsxProps`
- `BeatComponent`
- `BeatScope`
- `ShowProps`
- `ForProps`

Use these in libraries built on top of Beat when you need to type component inputs or low-level view helpers.

## Router

Beat's router is an SPA router built on explicit Pulse route state.
The current route is exposed through `router.current`.

### `createRouter(options)`

```ts
createRouter(options: CreateBeatRouterOptions): BeatRouter
```

`CreateBeatRouterOptions`:

```ts
interface CreateBeatRouterOptions {
  readonly routes: readonly BeatRouteDefinition[];
  readonly basePath?: string;
  readonly prefetchCacheMaxEntries?: number;
  readonly window?: Window;
  readonly onError?: (event: BeatRouteErrorEvent) => void;
}
```

`BeatRouter`:

```ts
interface BeatRouter {
  readonly current: Pulse<BeatRouteMatch>;
  readonly onError?: (event: BeatRouteErrorEvent) => void;
  resolve(to: string): URL;
  navigate(to: string, options?: BeatNavigateOptions): void;
  prefetch(to: string): Promise<void>;
  invalidatePrefetch(to?: string): void;
  reload(): void;
  back(): void;
  dispose(): void;
}
```

Important current behavior:

- redirects and guards resolve before navigation commits
- route loaders receive an `AbortSignal`
- `prefetch(to)` warms route and named-outlet loaders without changing current route state or history
- prefetched route data is stored in a bounded in-memory cache and reused on later navigation
- `invalidatePrefetch(to?)` clears one prefetched route or the whole prefetch cache and aborts matching in-flight prefetches
- stale loader results are suppressed on newer navigations
- `reload()` reruns the current route loaders without pushing new history
- disposing the router aborts in-flight loaders
- named outlets keep their own branch loader state

### Route Definitions

```ts
interface BeatRouteDefinition {
  readonly path: string;
  readonly outlet?: string;
  readonly view: (match: BeatRouteMatch) => BeatJsxChild;
  readonly errorView?: (error: unknown, match: BeatRouteMatch) => BeatJsxChild;
  readonly children?: readonly BeatRouteDefinition[];
  readonly load?: (match: BeatRouteMatch, signal: AbortSignal) => Promise<unknown>;
  readonly redirectTo?: BeatNavigationTarget | ((match: BeatRouteMatch) => BeatNavigationTarget);
  readonly beforeEnter?: (context: BeatRouteGuardContext) => BeatRouteGuardResult;
}
```

Key fields:

- `path`: route segment pattern
- `view`: rendered view for the route branch
- `children`: nested route tree
- `outlet`: named outlet target, defaults to the main outlet
- `load`: async branch loader
- `errorView`: fallback shown for route loader or render failures
- `redirectTo`: static or computed redirect
- `beforeEnter`: navigation guard

### `BeatRouteMatch`

```ts
interface BeatRouteMatch {
  readonly path: string;
  readonly fullPath: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly route?: BeatRouteDefinition;
  readonly matches: readonly BeatRouteBranchMatch[];
  readonly routeData: readonly BeatRouteDataMatch[];
  readonly depth: number;
  readonly status: BeatRouteDataStatus;
  readonly loading: boolean;
  readonly data: unknown;
  readonly error: unknown;
  outlet(name?: string): BeatJsxChild | null;
  navigate(to: string, options?: BeatNavigateOptions): void;
  back(): void;
}
```

Important behavior:

- `status`, `loading`, `data`, and `error` reflect the leaf route of the current branch
- `routeData` contains per-branch route loader state
- `outlet()` renders the next branch level
- `outlet(name)` renders a named outlet branch
- `navigate(to)` navigates to a new route from the current match context
- `back()` navigates to the previous history entry

### Router Components

#### `Link(props)`

```ts
interface LinkProps extends BeatJsxProps {
  readonly router: BeatRouter;
  readonly to: string;
  readonly replace?: boolean;
  readonly prefetch?: boolean | "hover" | "focus";
}
```

Render a router-aware anchor that intercepts navigation through Beat.

`prefetch` behavior:

- `true`: prefetch on hover and focus
- `"hover"`: prefetch on hover only
- `"focus"`: prefetch on focus only

#### `Outlet(props)`

```ts
interface OutletProps {
  readonly router: BeatRouter;
  readonly name?: string;
}
```

Render the current route branch or named outlet branch.

### Router Types

Beat exports these router-related types:

- `BeatRouteDefinition`
- `BeatRouteMatch`
- `BeatRouteBranchMatch`
- `BeatRouteDataMatch`
- `BeatRouteDataStatus`
- `BeatNavigateOptions`
- `BeatRouteErrorPhase`
- `BeatRouteErrorEvent`
- `CreateBeatRouterOptions`
- `LinkProps`
- `OutletProps`

## Resources

Beat resources provide explicit async state and optional shared caching.

### `createResource(options)`

```ts
createResource<TSource, TValue>(
  options: CreateBeatResourceOptions<TSource, TValue>,
): BeatResource<TValue>
```

`CreateBeatResourceOptions`:

```ts
interface CreateBeatResourceOptions<TSource, TValue> {
  readonly source?: Pulse<TSource>;
  readonly initialValue?: TValue;
  readonly load: (source: TSource, signal: AbortSignal) => Promise<TValue>;
  readonly immediate?: boolean;
  readonly debounceMs?: number;
  readonly keepStaleWhileRefreshing?: boolean;
  readonly getCacheKey?: (source: TSource) => string;
  readonly cacheTimeMs?: number;
  readonly cache?: BeatResourceCache<TValue>;
}
```

`source` is optional.
When it is omitted, the resource becomes a manually triggered async state machine and `reload()` runs `load(...)` without subscribing to any pulse source.

`BeatResource`:

```ts
interface BeatResource<TValue> {
  readonly state: Pulse<BeatResourceState<TValue>>;
  invalidate(cacheKey?: string): void;
  reload(): Promise<void>;
  dispose(): void;
}
```

State shape:

```ts
interface BeatResourceState<TValue> {
  readonly status: "idle" | "pending" | "resolved" | "rejected";
  readonly loading: boolean;
  readonly data: TValue | undefined;
  readonly error: unknown;
}
```

Important current behavior:

- loads receive an `AbortSignal`
- stale async completions are ignored
- `dispose()` aborts the active request
- debounced reload promises settle correctly across reschedules and dispose
- resources can run without a source pulse when used as manual loaders
- resource state remains explicit instead of being hidden behind Suspense-style control flow

### `createResourceCache(options?)`

```ts
createResourceCache<TValue>(
  options?: CreateBeatResourceCacheOptions,
): BeatResourceCache<TValue>
```

`CreateBeatResourceCacheOptions`:

```ts
interface CreateBeatResourceCacheOptions {
  readonly maxEntries?: number;
  readonly defaultCacheTimeMs?: number;
  readonly namespace?: string;
  readonly eviction?: "lru" | "fifo";
}
```

`BeatResourceCache`:

```ts
interface BeatResourceCache<TValue> {
  get(cacheKey: string): TValue | undefined;
  set(cacheKey: string, value: TValue, cacheTimeMs?: number): void;
  delete(cacheKey: string): void;
  clear(): void;
  pruneExpired(): number;
  size(): number;
  namespace(namespace: string): BeatResourceCache<TValue>;
}
```

Use shared caches when multiple resources should reuse the same resolved values.

Current cache capabilities:

- max entry bounds
- per-entry TTL
- default TTL
- namespaces
- `lru` or `fifo` eviction
- explicit pruning and size inspection

### Resource Types

Beat exports these resource-related types:

- `BeatResource`
- `BeatResourceState`
- `BeatResourceStatus`
- `BeatResourceCache`
- `BeatResourceCacheEviction`
- `CreateBeatResourceOptions`
- `CreateBeatResourceCacheOptions`

## Vite Plugin

Beat exposes a Vite plugin from `@ochairo/beat/vite-plugin`.

### `createBeatVitePlugin(options?)`

```ts
createBeatVitePlugin(options?: CreateBeatVitePluginOptions): PluginOption
```

`CreateBeatVitePluginOptions`:

```ts
interface CreateBeatVitePluginOptions {
  readonly packageRoot?: string;
  readonly packageName?: string;
  readonly aliasLocalSource?: boolean;
}
```

Current responsibilities:

- standardize Beat JSX runtime resolution
- lower Beat control-flow tags from direct and member-expression JSX forms
- lower explicit intrinsic bindings:
  - `text={...}`
  - `class:name={...}`
  - `style:name={...}`
  - `prop:name={...}`
- lower safe intrinsic single-child text expressions into Beat's direct text binding path

The Vite plugin is intentionally a separate subpath export rather than part of the main runtime entry.

## Current Limitations

This API reference describes the current SPA-oriented Beat surface.
These are not yet part of the completed platform story:

- SSR
- hydration
- a broader full-stack platform surface beyond the documented SPA runtime and compiler scope

## Recommended Starting Surface

For most app code, start with:

- `createRoot()` or `render()`
- `component()` and `onCleanup()`
- `Show` and `For`
- `createRouter()`, `Link`, and `Outlet`
- `createResource()`
