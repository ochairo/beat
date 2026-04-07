# Beat Benchmark Methodology

This document describes the benchmark workflow currently used to compare Beat against the sample React and Solid implementations in this repository.

Beat should only claim performance wins where the methodology is public, repeatable, and narrow enough to be defensible.

There are now two complementary benchmark layers in this repository:

- a standalone Beat core-binding benchmark driven in Node with Happy DOM
- the browser-level sample comparison benchmark driven with Playwright

## Scope

The current benchmark suite is not a universal framework benchmark.
It is a repository-local comparison of three implementations of the same sample application surfaces:

- Beat
- React
- Solid

Those comparisons are intended to answer a specific question:

> on DOM-heavy, repeated-object client surfaces, does Beat's direct-DOM Pulse-native model do less work than the sample React and Solid implementations?

That is the claim surface.
Anything broader would overstate what the current evidence proves.

## Current Benchmark Surfaces

The Playwright benchmark currently exercises three surfaces:

- `table`
- `cards`
- `editor`

These are all driven from the sample apps under `sample/beat`, `sample/react`, and `sample/solid`.

Each surface uses the same application domain and the same broad workload shape, while allowing each framework sample to use an implementation style that is still reasonable for that framework.

## Measured Interactions

The automated benchmark currently records four interactions from each sample:

- `Run batched sweep`
- `Run unbatched sweep`
- `Run write storm`
- `Shift focused row`

The Playwright harness now reads three metrics from the sample UI after each interaction:

- `Last write burst`
- `Last visual settle`
- `Last total burst`

`Last write burst` is the synchronous mutation and commit phase measured inside the sample.
`Last visual settle` is the delay until the UI has crossed the next paint boundary.
`Last total burst` is the full interaction time and is the fairest headline number for cross-framework comparison.

Those numbers are still application-side timings collected from the sample itself, not synthetic benchmark-loop timings generated entirely inside the test runner.

## How The Harness Works

The benchmark entry point is:

```sh
pnpm sample:test:performance
```

That command delegates to the backend-owned Playwright runner and uses [sample/backend/playwright.config.mjs](../sample/backend/playwright.config.mjs).

The configured workflow is:

1. build the Beat, React, and Solid sample apps
2. start the Fastify sample backend on `http://127.0.0.1:4173`
3. visit each sample in benchmark mode
4. run the benchmark controls from the UI
5. collect and average the reported timings

The browser-side comparison logic lives in [playwright/performance.spec.ts](../playwright/performance.spec.ts).

## Repeatability Rules

The current harness includes a few deliberate controls:

- it runs multiple iterations instead of trusting a single pass
- it rotates sample order across iterations
- it averages results per sample and surface
- it uses the same row count and query parameters for each framework sample

These controls matter because framework comparisons are otherwise too easy to skew with warm-cache effects, lucky run order, or one unusually noisy browser pass.

## Commands

Useful commands in the Beat package:

```sh
pnpm benchmark
pnpm benchmark:report
pnpm sample:build
pnpm sample:serve
pnpm sample:test:performance
```

`pnpm benchmark` is the narrow core-binding benchmark.
It exercises helper-level paths such as `bindText()`, `bindProperty()`, `bindFields()`, and JSX pulse property bindings in isolation.

`pnpm benchmark:report` runs that same standalone benchmark and updates this file's generated results block.

`pnpm sample:test:performance` is the browser-level comparison benchmark.
It measures the full sample surfaces and includes DOM layout, browser scheduling, and application-specific update paths.
Its console output now reports multiple scenarios and separates write time from full interaction time.

Typical workflow:

```sh
pnpm benchmark
pnpm sample:test:performance
```

If you want to inspect the built samples directly:

```sh
pnpm sample:build
pnpm sample:serve
```

Then open:

- `http://127.0.0.1:4173/beat/`
- `http://127.0.0.1:4173/react/`
- `http://127.0.0.1:4173/solid/`

Benchmark mode is enabled through query parameters such as:

- `/beat/bench.html?rows=2000&surface=table`
- `/beat/bench.html?rows=2000&surface=cards`
- `/beat/bench.html?rows=2000&surface=editor`

## Standalone Binding Results

Latest standalone Beat benchmark run from this workspace:

<!-- benchmark-results:start -->

Generated: 2026-04-07T14:33:35.059Z

### Binding Costs

Fastest path: **bindText update** at **864 ns/op**.
Slowest path in this section: **bindFields market row replace** at **0.004 ms/op**.

| Benchmark | Time/op | Compared With Fastest | Reading | Iterations |
| --- | ---: | ---: | --- | ---: |
| bindText update | 864 ns/op | fastest | Best result in this section | 10,000 |
| jsx pulse property bindings | 0.002 ms/op | 1.83x slower | Noticeably slower, but still in the same tier | 10,000 |
| bindProperty input and checkbox update | 0.002 ms/op | 2.10x slower | Noticeably slower, but still in the same tier | 10,000 |
| bindFields market leaf field updates | 0.002 ms/op | 2.32x slower | Noticeably slower, but still in the same tier | 10,000 |
| bindFields market leaf field updates in batch | 0.003 ms/op | 3.08x slower | Meaningfully slower than the fastest path | 10,000 |
| bindFields market row replace in batch | 0.004 ms/op | 4.23x slower | Meaningfully slower than the fastest path | 10,000 |
| bindFields market row replace | 0.004 ms/op | 4.32x slower | Meaningfully slower than the fastest path | 10,000 |
<!-- benchmark-results:end -->

These results are useful for isolating Beat runtime and helper overhead without browser-layout noise.
They should not be presented as replacements for the Playwright sample benchmark.

## Latest Sample Comparison Snapshot

Latest fair Playwright sample run from this workspace.
These tables use `Last total burst`, not just synchronous write time.

<!-- sample-benchmark-results:start -->

Generated: 2026-04-06T14:50:09.281Z

### Batched Sweep Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 79.00 ms | 113.67 ms | 120.10 ms | Beat | fastest |
| Cards | 64.93 ms | 144.37 ms | 147.07 ms | Beat | fastest |
| Editor | 66.77 ms | 220.93 ms | 216.73 ms | Beat | fastest |

### Unbatched Sweep Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 58.03 ms | 66.03 ms | 58.30 ms | Beat | fastest |
| Cards | 40.90 ms | 34.00 ms | 47.30 ms | React | 1.20x slower |
| Editor | 15.37 ms | 42.80 ms | 43.00 ms | Beat | fastest |

### Write Storm Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 66.43 ms | 101.17 ms | 98.73 ms | Beat | fastest |
| Cards | 44.83 ms | 95.50 ms | 94.30 ms | Beat | fastest |
| Editor | 46.83 ms | 163.10 ms | 140.07 ms | Beat | fastest |

### Focus Shift Total Time

| Surface | Beat | React | Solid | Winner | Beat vs Winner |
| --- | ---: | ---: | ---: | --- | ---: |
| Table | 51.80 ms | 54.97 ms | 56.87 ms | Beat | fastest |
| Cards | 52.73 ms | 50.47 ms | 49.53 ms | Solid | 1.06x slower |
| Editor | 30.07 ms | 11.73 ms | 11.30 ms | Solid | 2.66x slower |

### Plain-English Read

- Using total interaction time, Beat wins 9 of the 12 current sample scenarios in this snapshot.
- Beat is strongest on the sweep and write-storm paths, where it stays well ahead across all three surfaces.
- The remaining weak spot is focus shift, especially on the editor surface, where browser-facing visual settle cost still dominates.
- This block is now generated from the same Playwright run instead of being maintained manually, so the docs stay aligned with the actual benchmark output.
<!-- sample-benchmark-results:end -->

This is a better benchmark story than the previous one because it is narrower and harder to overstate.
Beat can point to real wins, but it also has to carry its weaker surfaces in the same report.

## Fairness Rules

Beat should hold itself to these rules when discussing benchmark results:

- do not claim universal superiority from these sample benchmarks
- do not cherry-pick a single best run
- do not hide weaker surfaces when presenting stronger ones
- do not compare different workloads and present them as equivalent
- do not headline synchronous write time when total interaction time tells a different story
- do not treat benchmark-only tricks as framework wins unless the path is maintainable and reusable

## What Current Results Can Support

When the benchmark is green and repeatable, it can support narrow claims like these:

- Beat is competitive on the sample surfaces in this repository
- Beat can win on repeated-object, DOM-heavy client updates when its direct binding model matches the workload
- performance work should continue to focus on row/object binding hot paths rather than generic rerender abstractions
- helper-level benchmarks should be used to validate runtime and DOM binding changes before judging them by browser-level Playwright variance

## What Current Results Cannot Support

The current methodology does not justify claims like these:

- Beat is faster than every other UI framework in general
- Beat is always faster than React or Solid on every workload
- Beat is already production-ready because the sample benchmark is strong

Benchmarks are only one part of the `1.0.0` bar.
They matter, but they do not replace API stability, correctness, documentation, or release discipline.
