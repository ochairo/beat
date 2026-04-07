# Beat Support Policy

This document describes the current environment support, versioning posture, and known limitations for Beat.

Beat is still pre-`1.0.0`.
The goal of this policy is to make active development constraints explicit, not to overstate platform maturity.

## Environment Support

### Package Tooling

Beat currently expects:

- Node `>=24 <25`
- pnpm `>=10`

Those ranges match the package metadata and the environment used for Beat development and validation.

### Browser Runtime

Beat currently targets modern evergreen browsers with support for:

- ES modules
- `URL`
- `URLSearchParams`
- `AbortController`
- `history.pushState` and `popstate`
- standard DOM APIs used by direct node rendering

In practical terms, Beat's current client runtime should be treated as targeting current stable versions of:

- Safari
- Chrome
- Edge
- Firefox

Beat does not currently claim a formally tested legacy-browser matrix.

## Versioning Policy

Beat uses semver-shaped versions, but while Beat remains below `1.0.0` the stability expectations are intentionally stricter than a throwaway prototype and looser than a frozen framework.

For the current `0.2.x` line:

- patch releases should be used for fixes, documentation corrections, and non-breaking refinements
- minor releases may still include contract adjustments when they improve long-term framework consistency
- breaking changes should be documented explicitly in the changelog and related docs

The intent is to reduce churn, not to pretend the public API is already frozen.

## Production Use Guidance

Beat can already be used for:

- internal tools
- framework evaluation
- performance experiments
- early adopter applications with tight ownership of dependencies

Beat should not yet be presented as a fully hardened general-purpose production framework.

Teams adopting Beat before `1.0.0` should be comfortable with:

- following release notes closely
- updating application code when framework contracts sharpen
- staying within the documented SPA client-rendering scope

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
- browser compatibility guidance is still policy-based rather than backed by a large cross-browser automation matrix
- SSR and hydration remain future design work rather than active platform promises

## Validation Expectations

Before release candidates or stable claims, Beat should continue to keep these green:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

The combined `pnpm validate` command is the expected package-level validation entry point.
