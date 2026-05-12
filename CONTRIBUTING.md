# Contributing to Beat

Thanks for your interest in contributing to Beat.

## Prerequisites

- Node.js `>=24 <25`
- pnpm `>=10`

## Setup

```sh
git clone https://github.com/ochairo/beat.git
cd beat
pnpm install
```

## Development Workflow

```sh
pnpm test          # run tests
pnpm test:watch    # run tests in watch mode
pnpm typecheck     # type-check with tsc --noEmit
pnpm build         # compile and minify
pnpm validate      # run all of the above
```

Always run `pnpm validate` before submitting a PR.

## Architecture Overview

Beat is a Pulse-native JSX framework. The main modules are:

- **jsx-runtime** — JSX transform, `component()`, `Show`, `For`, `onCleanup`
- **render** — `createRoot()`, `render()`
- **dom** — low-level DOM bindings (`bindText`, `bindClass`, `bindStyle`, `bindProperty`, `on`)
- **router** — SPA router (`createRouter`, `Link`, `Outlet`, route matching, prefetch, guards)
- **resource** — async state (`createResource`, `createResourceCache`)
- **vite-plugin** — compiler that lowers Beat-specific JSX syntax

Entry points are exported from `src/index.ts`. The JSX runtime subpaths (`jsx-runtime`, `jsx-dev-runtime`) and the Vite plugin are separate entry points.

## Pull Request Guidelines

1. Start by opening or confirming the issue you are working on
2. Fork the repo and create a branch from `develop` using the format `feature/<issueNo>`
3. Open pull requests against `develop`. Contributor changes should not target `main` directly
4. Write tests for any new functionality
5. Make sure `pnpm validate` passes
6. Keep PRs focused — one feature or fix per PR
7. Write clear commit messages

## Release Flow

Regular development happens on `develop`.
Contributors should create an issue first, then branch from `develop` as `feature/<issueNo>` and open the pull request back into `develop`.
To publish a release, maintainers merge `develop` into `main` and create the release tag from `main`.

## Code Style

- Strict TypeScript — no `any`
- Use `unknown` when the type is genuinely unknown
- Let TypeScript infer types where possible
- Explicit return types for public APIs
- Follow existing naming conventions (camelCase for functions, PascalCase for types/components)

## Testing

Tests use [vitest](https://vitest.dev/) with happy-dom for DOM testing.

- Test files live in `tests/`
- Match test file names to the module being tested
- Cover edge cases and error conditions

## Reporting Issues

Use [GitHub Issues](https://github.com/ochairo/beat/issues). Include:

- Beat and Pulse versions
- Minimal reproduction
- Expected vs actual behavior
