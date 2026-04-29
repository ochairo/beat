# Beat Compiler Contract

This document describes the current compiler-facing contract for Beat's JSX transform.

Beat `1.1.x` freezes the documented lowering model unless a change fixes incorrect behavior.

## Scope

The current compiler contract is implemented by `@ochairo/beat/vite-plugin`.

Its job is intentionally narrow:

- configure Beat as the JSX import source for Vite
- lower explicit intrinsic binding syntax into internal runtime props
- avoid overreaching into unrelated JSX or application code

Beat does not currently ship a whole-program optimizing compiler.
The current contract is selective and targeted at hot-path authoring patterns that Beat can support cleanly.

## Required Setup

TypeScript:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@ochairo/beat"
  }
}
```

Vite:

```ts
import { defineConfig } from "vite";
import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";

export default defineConfig({
  plugins: [createBeatVitePlugin()],
});
```

## Current Lowering Rules

### Beat Runtime Components

Beat control-flow and routing components stay on the normal JSX runtime path.

That includes component forms such as:

- `<Show ...>`
- `<For ...>`
- `<Link ...>`
- `<Outlet ...>`

These components are handled by Beat's JSX runtime directly rather than by a Vite-specific lowering pass.

### Explicit Intrinsic Bindings

The plugin lowers these intrinsic bindings on lowercase DOM tags:

- `text={value}`
- `class:name={value}`
- `style:name={value}`
- `prop:name={value}`

Conceptually:

```tsx
<button text={label} class:active={isActive} prop:value={value} />
```

becomes internal Beat runtime props that are handled by the JSX runtime and DOM binding helpers.

These internal props are implementation details:

- `__beatText`
- `__beatClassBindings`
- `__beatStyleBindings`
- `__beatPropertyBindings`

Authors should write the public binding syntax, not the internal prop names.

### Safe Single-Child Text Lowering

For lowercase intrinsic tags only, Beat may lower a single child expression into the same internal text-binding path when all of these are true:

- there is exactly one meaningful child expression
- there is no explicit `text={...}` binding already present
- the transform can preserve semantics without touching mixed-content structure

Conceptually:

```tsx
<button>{label}</button>
```

may lower into the same internal text-binding path as:

```tsx
<button text={label} />
```

Beat intentionally does not do this for mixed content such as:

```tsx
<button>
  prefix {label}
</button>
```

## Stability Expectations

For the current `1.1.x` line:

- the public syntax documented above is the contract
- the exact generated internal prop names are not public API
- patch releases may fix incorrect transforms or non-overreach bugs without changing the documented public syntax
- minor releases may expand the lowering surface additively
- breaking changes to the documented lowering contract are reserved for future major versions

## Non-Goals In The Current Compiler

Beat does not currently promise:

- static DOM hoisting across modules
- whole-template specialization for arbitrary JSX
- SSR-oriented compiler output
- hydration markers or resumability semantics
- lowering every possible dynamic child shape into a custom fast path

Those may come later, but they are not part of the current stable compiler contract.

## Authoring Guidance

Prefer these patterns when writing Beat views:

- use `Show`, `For`, `Link`, and `Outlet` directly for framework primitives
- use explicit intrinsic bindings when the update intent is clear
- keep Pulse values explicit at the edge of the view instead of wrapping them in another reactive abstraction
- treat JSX as Beat authoring syntax, not as permission to rely on generic rerender behavior

## Regression Coverage

The compiler contract is protected by Beat's Vite plugin tests.

Coverage currently includes:

- explicit intrinsic binding lowering
- preserving Beat runtime components on the normal JSX path
- safe single-child text lowering
- spread-prop preservation
- non-overreach on mixed-content JSX
