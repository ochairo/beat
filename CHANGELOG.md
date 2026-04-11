# Changelog

All notable changes to Beat are documented in this file.

## 1.0.2

- fixes the router starter runtime bug caused by unsupported JSX child handling in the counter view
- adds strict TypeScript-safe router starter source and a scaffold smoke test that installs and typechecks generated router apps
- keeps Beat and `@ochairo/create-beat` aligned for the next publish

## 1.0.1

- aligns Beat with the `create-beat@1.0.1` release after the scoped publish and local-workspace scaffolding fixes
- keeps the Beat package and scaffolder on the same release version expected by the publish workflow

## 1.0.0

- declares the stable `1.0.x` release line for client-rendered SPA applications
- freezes the documented runtime, compiler, router, and resource contracts within the published scope
- formalizes Beat's support posture as stable within the documented SPA client-rendering boundary
- treats SSR and hydration as out-of-scope product tracks rather than blockers for Beat `1.0.0`
- aligns `create-beat` with the Beat `1.0.0` release line
