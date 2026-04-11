# Beat Support Policy

This document describes the current environment support, versioning posture, and known limitations for Beat.

Beat `1.0.x` is stable for production use within its documented client-rendered SPA scope.
This policy defines the supported environment, release posture, and product boundaries for that scope.

## Environment Support

### Package Tooling

Beat currently expects:

- Node `>=24 <25`
- pnpm `>=10`

Those ranges match the package metadata and the environment used for Beat development and validation.

### Browser Runtime

Beat `1.0.x` supports current stable releases of:

- Safari
- Chrome
- Edge
- Firefox

Supported browsers are expected to provide:

- ES modules
- `URL`
- `URLSearchParams`
- `AbortController`
- `history.pushState` and `popstate`
- standard DOM APIs used by direct node rendering

Legacy browsers are unsupported.
Release validation is anchored by package-level validation plus the sample benchmark harness smoke flow; browser regressions inside the supported evergreen scope should be treated as release blockers.

## Versioning Policy

Beat uses semantic versioning.

For the current `1.x` line:

- patch releases are for fixes, documentation corrections, and non-breaking refinements
- minor releases are for additive features and compatible improvements
- breaking changes are reserved for future major versions and should be documented explicitly in the changelog and related docs

## Production Use Guidance

Beat is intended for:

- production client-rendered SPA applications
- internal tools and dashboards
- direct-DOM applications that benefit from Pulse-native fine-grained updates
- applications that want explicit routing and explicit async state without a rerender-by-default model

Beat `1.0.x` is not a general-purpose full-stack framework release.
It is stable within the documented SPA client-rendering scope and should be presented that way.

## Current Non-Goals

These are intentionally not part of Beat's current support promise:

- SSR
- hydration
- legacy browser support
- multi-framework interop guarantees
- production devtools ecosystem guarantees

## Known Limitations

Beat's current limitations are structural, not accidental:

- the compiler is selective rather than a full optimizing pipeline
- the framework contract is focused on client-rendered SPA applications
- SSR and hydration remain future design work rather than active platform promises

## Validation Expectations

Before each Beat release, these should stay green:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm exec vitest run tests/create-beat.test.ts`
- `cd create-beat && npm pack --dry-run`
- `pnpm --dir sample/backend benchmark:run`

The combined `pnpm validate` command is the expected package-level validation entry point.

For the concrete `1.0.0` release bar, see `docs/V1_CHECKLIST.md`.
