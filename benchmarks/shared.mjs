import { performance } from "node:perf_hooks";
import { Window } from "happy-dom";

export function installDomGlobals() {
  const window = new Window();

  Object.assign(globalThis, {
    window,
    document: window.document,
    Node: window.Node,
    Text: window.Text,
    Comment: window.Comment,
    Element: window.Element,
    Event: window.Event,
    EventTarget: window.EventTarget,
    HTMLElement: window.HTMLElement,
    HTMLInputElement: window.HTMLInputElement,
    HTMLButtonElement: window.HTMLButtonElement,
    DocumentFragment: window.DocumentFragment,
  });

  return window;
}

export function runBenchmarkSuite(suiteTitle, sections, options = {}) {
  const { quiet = false } = options;

  if (!quiet) {
    console.log(suiteTitle);
  }

  const suite = {
    title: suiteTitle,
    sections: [],
  };

  for (const section of sections) {
    if (!quiet) {
      console.log(`\n${"-".repeat(72)}`);
      console.log(section.title);
      console.log("-".repeat(72));
    }

    const results = [];

    for (const benchmark of section.cases) {
      const context = benchmark.setup?.();

      try {
        for (let index = 0; index < 25; index += 1) {
          benchmark.task(context);
        }

        const start = performance.now();

        for (let index = 0; index < benchmark.iterations; index += 1) {
          benchmark.task(context);
        }

        const durationMs = performance.now() - start;
        results.push({
          averageMs: durationMs / benchmark.iterations,
          iterations: benchmark.iterations,
          name: benchmark.name,
        });
      } finally {
        benchmark.teardown?.(context);
      }
    }

    const rankedResults = rankResults(results);
    suite.sections.push({
      title: section.title,
      cases: results,
      rankedCases: rankedResults,
    });

    if (!quiet) {
      printMeasuredResults(results);
      printCompareTable(rankedResults);
    }
  }

  return suite;
}

function printMeasuredResults(results) {
  for (const result of results) {
    console.log(
      `${result.name}: ${formatDuration(result.averageMs)} (${result.iterations.toLocaleString("en-US")} iterations)`,
    );
  }
}

function printCompareTable(rankedResults) {
  if (rankedResults.length === 0) {
    return;
  }

  const fastest = rankedResults[0];

  if (!fastest) {
    return;
  }

  console.log("\nCompare Table (lower is better)");

  const rows = rankedResults.map((result, index) => ({
    Rank: String(index + 1),
    Benchmark: result.name,
    "Time/op": formatDuration(result.averageMs),
    Relative:
      index === 0
        ? "fastest"
        : `${(result.averageMs / fastest.averageMs).toFixed(2)}x`,
    Delta:
      index === 0 ? "-" : formatDuration(result.averageMs - fastest.averageMs),
  }));

  console.table(rows);
  console.log(
    `Fastest: ${fastest.name} at ${formatDuration(fastest.averageMs)}`,
  );
}

function rankResults(results) {
  const rankedResults = [...results].sort(
    (left, right) => left.averageMs - right.averageMs,
  );
  const fastest = rankedResults[0];

  if (!fastest) {
    return [];
  }

  return rankedResults.map((result, index) => ({
    ...result,
    deltaMs: index === 0 ? 0 : result.averageMs - fastest.averageMs,
    rank: index + 1,
    relativeToFastest: index === 0 ? 1 : result.averageMs / fastest.averageMs,
  }));
}

function formatDuration(valueMs) {
  if (valueMs < 0.001) {
    return `${Math.round(valueMs * 1_000_000).toLocaleString("en-US")} ns/op`;
  }

  return `${valueMs.toFixed(3)} ms/op`;
}
