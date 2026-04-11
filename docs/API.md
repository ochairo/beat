# Beat API Reference

This document describes the current public API of `@ochairo/beat`.

This reference documents Beat's stable `1.0.x` contract for client-rendered SPA applications.
For the broader framework direction and release goals, see `docs/V1_CHECKLIST.md`.
For compiler behavior and environment/versioning policy, see `docs/COMPILER.md` and `docs/SUPPORT.md`.

## Stability

Beat is currently in the `1.0.x` release line.

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

### `createApp(options)`

Create an app wrapper around an existing root Pulse state.

```ts
createApp<TRootState>(options: CreateBeatAppOptions<TRootState>): BeatApp<TRootState>
```

`CreateBeatAppOptions`:

```ts
interface CreateBeatAppOptions<TRootState> {
  readonly state: BeatRootState<TRootState>;
  readonly mount: (context: BeatMountContext<TRootState>) => void | BeatDispose;
}
```

`BeatApp`:

```ts
interface BeatApp<TRootState> {
  readonly state: BeatRootState<TRootState>;
  readonly mounted: boolean;
  mount(target: Element): void;
  destroy(): void;
}
```

Use `createApp()` when you want a small mount lifecycle around an existing root state object.
For JSX-first apps, `createRoot()` is usually the more direct entry point.

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

### `Show` and `show(...)`

Conditional rendering primitive.

Component form:

```ts
interface ShowProps<TValue> {
  readonly when: Pulse<TValue>;
  readonly children: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly fallback?: BeatJsxChild | ((value: TValue) => BeatJsxChild);
  readonly mapValue?: (value: TValue) => boolean;
}
```

Function form:

```ts
show<TValue>(
  condition: Pulse<TValue>,
  renderWhenTrue: BeatJsxChild | ((value: TValue) => BeatJsxChild),
  renderWhenFalse?: BeatJsxChild | ((value: TValue) => BeatJsxChild),
  mapValue?: (value: TValue) => boolean,
): BeatRendered<DocumentFragment>
```

Use `Show` or `show(...)` for explicit mount/unmount branch behavior.

### `For` and `forEach(...)`

Keyed collection rendering primitive.

Component form:

```ts
interface ForProps<TValue> {
  readonly each: Pulse<readonly TValue[]>;
  readonly children: (value: Pulse<TValue>, index: number) => BeatJsxChild;
  readonly key?: (value: TValue, index: number) => PropertyKey;
}
```

`For` keeps a stable `Pulse<TValue>` per keyed entry. Exact-path writes like `rows[0].label.set(...)` update that entry in place and should not remount sibling entries.

Function form:

```ts
forEach<TValue>(
  items: Pulse<readonly TValue[]>,
  renderItem: (value: Pulse<TValue>, index: number) => BeatJsxChild,
  getKey?: (value: TValue, index: number) => PropertyKey,
): BeatRendered<DocumentFragment>
```

Important behavior:

- each rendered item receives a stable `Pulse<TValue>` for the keyed item
- Beat reuses keyed entries where possible
- child-pulse field updates continue to flow through reused keyed entries without requiring structural array changes
- structural list changes remount only the entries that need to move or be created

### `toRendered(value)`

Normalize Beat JSX output into a rendered node plus optional cleanup.

This is mostly a low-level escape hatch for runtime integrations.
Most app code should not need it.

### Shared JSX Types

Beat exports several shared JSX and component types:

- `BeatJsxChild`
- `BeatJsxProps`
- `BeatComponent`
- `BeatScope`
- `ShowProps`
- `ForProps`

Use these in libraries built on top of Beat when you need to type component inputs or low-level view helpers.

## DOM Bindings

These APIs connect Pulse values directly to DOM nodes and elements.
They are important for library authors and for high-performance view code.

### `bindText(node, formatValue?, onChange?)`

```ts
bindText<TValue>(
  node: Pulse<TValue>,
  formatValue?: (value: TValue) => string,
  onChange?: (value: TValue) => void,
): BeatRendered<Text>
```

Create a text node that stays subscribed to a Pulse value.

### `bindClass(element, className, node, mapValue?, onChange?)`

```ts
bindClass<TValue>(
  element: Element,
  className: string,
  node: Pulse<TValue>,
  mapValue?: (value: TValue) => boolean,
  onChange?: (value: TValue) => void,
): BeatCleanup
```

Toggle a single class name from a Pulse value.

### `bindClasses(element, node, mapValue, onChange?)`

```ts
bindClasses<TValue>(
  element: Element,
  node: Pulse<TValue>,
  mapValue: (value: TValue) => Record<string, boolean>,
  onChange?: (value: TValue) => void,
): BeatCleanup
```

Bind multiple classes at once from a mapped object.

### `bindStyle(element, propertyName, node, mapValue?, onChange?)`

```ts
bindStyle<TValue>(
  element: HTMLElement,
  propertyName: string,
  node: Pulse<TValue>,
  mapValue?: (value: TValue) => string,
  onChange?: (value: TValue) => void,
): BeatCleanup
```

Bind a single style property to a Pulse value.

### `bindProperty(element, propertyName, node, mapValue?, onChange?)`

```ts
bindProperty<TValue>(
  element: Element,
  propertyName: string,
  node: Pulse<TValue>,
  mapValue?: (value: TValue) => unknown,
  onChange?: (value: TValue) => void,
): BeatCleanup
```

Bind a DOM property or attribute to a Pulse value.
This is the low-level primitive used by Beat's lowered `prop:*` bindings.

### `bindFields(node, bindings)`

```ts
bindFields<TValue extends object>(
  node: Pulse<TValue>,
  bindings: BeatFieldBindings<TValue>,
): BeatCleanup
```

Bind an object-shaped Pulse node by field.
This is the preferred maintainable path for repeated object-shaped UI where a single object write updates several related fields.
Beat subscribes to each exact child field directly, so `node.count.set(...)` or an ancestor replacement that changes `count` both update the bound field without relying on parent listener fanout.

### `bindMasked(node, binding)`

```ts
bindMasked<TValue>(
  node: Pulse<TValue>,
  binding: BeatMaskedBinding<TValue>,
): BeatCleanup
```

Use a bitmask-driven binding strategy for extremely hot repeated-object update paths.
This is a lower-level performance primitive than `bindFields()`.
For object-like values, Beat tracks immediate exact child paths and applies the mask from those child mutations instead of assuming object-level listeners see descendant writes.

### `createObjectKeyMask(maskByKey, fullMask)`

```ts
createObjectKeyMask<TValue extends object>(
  maskByKey: BeatObjectMaskMap<TValue>,
  fullMask: number,
): (changes: readonly PulseMutation[]) => number
```

Helper for turning Pulse object-key mutations into bitmasks consumed by `bindMasked()`.

### `mountEach(items, renderItem, getKey?)`

`mountEach(...)` is a DOM-level list mounting helper used by Beat's collection rendering path.
Prefer `For` or `forEach(...)` for normal application code unless you are building low-level abstractions.
It watches exact array replacement and `length` changes, which matches Pulse's exact-path array semantics.

### `on(element, event, handler, options?)`

Register a DOM event listener and return a cleanup function.

Use this when building manual DOM helpers or wrapper components.

### `composeCleanup(...cleanups)`

Combine multiple cleanup functions into one cleanup function.

### Shared DOM Types

Beat exports these DOM helper types:

- `BeatCleanup`
- `BeatRendered`
- `BeatMaskedBinding`
- `BeatObjectMaskMap`

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
}
```

Important behavior:

- `status`, `loading`, `data`, and `error` reflect the leaf route of the current branch
- `routeData` contains per-branch route loader state
- `outlet()` renders the next branch level
- `outlet(name)` renders a named outlet branch

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

#### `outlet(router, name?)`

Low-level helper form of outlet rendering.
Prefer `Outlet({ router, name })` or JSX `<Outlet router={router} />` in normal usage.

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

### `createDebouncedResource(options)`

```ts
createDebouncedResource<TSource, TValue>(
  options: CreateBeatDebouncedResourceOptions<TSource, TValue>,
): BeatResource<TValue>
```

This is a convenience wrapper around `createResource()` with required `debounceMs`.

### `createStaleWhileRefreshResource(options)`

```ts
createStaleWhileRefreshResource<TSource, TValue>(
  options: CreateBeatResourceOptions<TSource, TValue>,
): BeatResource<TValue>
```

This is a convenience wrapper around `createResource()` with `keepStaleWhileRefreshing: true`.

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
- `CreateBeatDebouncedResourceOptions`
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
- `createResource()` or one of the resource wrappers

Reach for the low-level DOM helpers when:

- you are building Beat abstractions
- you need object-level optimized bindings
- you are tuning a hot rendering path
