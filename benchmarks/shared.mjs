import { performance } from "node:perf_hooks";
import { Window } from "happy-dom";

const SECTION_DIVIDER = "-".repeat(72);
const BENCHMARK_PRESETS = {
  full: {
    maxCalibrationScale: 16,
    minSampleDurationMs: 12,
    sampleCount: 5,
    warmupIterations: 25,
  },
};

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
  const runConfig = createBenchmarkRunConfig(options);

  if (!quiet) {
    console.log(suiteTitle);
  }

  const suite = {
    benchmarkPreset: runConfig.preset,
    title: suiteTitle,
    sections: [],
  };

  for (const section of sections) {
    if (!quiet) {
      console.log(`\n${SECTION_DIVIDER}`);
      console.log(section.title);
      console.log(SECTION_DIVIDER);
    }

    const results = [];

    for (const benchmark of section.cases) {
      const result = measureCase(benchmark, runConfig);
      results.push({
        averageMs: result.averageMs,
        configuredIterations: benchmark.iterations,
        iterations: result.operationsPerSample,
        medianMs: result.medianMs,
        name: benchmark.name,
        relativeStdDevPct: result.relativeStdDevPct,
        sampleCount: result.sampleCount,
      });
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
      `${result.name}: median ${formatDuration(getBenchmarkScore(result))}, mean ${formatDuration(result.averageMs)}, rsd ${(result.relativeStdDevPct ?? 0).toFixed(1)}% (${result.iterations.toLocaleString("en-US")} ops/sample from base ${(result.configuredIterations ?? result.iterations).toLocaleString("en-US")}, ${result.sampleCount ?? 1} samples)`,
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
    Median: formatDuration(getBenchmarkScore(result)),
    Mean: formatDuration(result.averageMs),
    RSD: `${(result.relativeStdDevPct ?? 0).toFixed(1)}%`,
    Relative:
      index === 0 ? "fastest" : `${result.relativeToFastest.toFixed(2)}x`,
    Delta: index === 0 ? "-" : formatDuration(result.deltaMs),
  }));

  console.table(rows);
  console.log(
    `Fastest: ${fastest.name} at ${formatDuration(getBenchmarkScore(fastest))}`,
  );
}

function rankResults(results) {
  const rankedResults = [...results].sort(
    (left, right) => getBenchmarkScore(left) - getBenchmarkScore(right),
  );
  const fastest = rankedResults[0];

  if (!fastest) {
    return [];
  }

  const fastestScore = getBenchmarkScore(fastest);

  return rankedResults.map((result, index) => ({
    ...result,
    deltaMs: index === 0 ? 0 : getBenchmarkScore(result) - fastestScore,
    rank: index + 1,
    relativeToFastest:
      index === 0 ? 1 : getBenchmarkScore(result) / fastestScore,
  }));
}

function getBenchmarkScore(result) {
  return result.medianMs ?? result.averageMs;
}

function measureCase(benchmark, runConfig) {
  const sampleCount = benchmark.sampleCount ?? runConfig.sampleCount;
  const operationsPerSample = resolveOperationsPerSample(benchmark, runConfig);
  const samplesMs = [];
  let totalDurationMs = 0;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const context = benchmark.setup?.();

    try {
      runBenchmarkIterations(
        benchmark,
        context,
        Math.min(runConfig.warmupIterations, operationsPerSample),
      );

      const start = performance.now();
      runBenchmarkIterations(benchmark, context, operationsPerSample);
      const durationMs = performance.now() - start;

      totalDurationMs += durationMs;
      samplesMs.push(durationMs / operationsPerSample);
    } finally {
      benchmark.teardown?.(context);
    }
  }

  const sortedSamplesMs = [...samplesMs].sort((left, right) => left - right);
  const averageMs = totalDurationMs / (operationsPerSample * sampleCount);
  const medianMs =
    sortedSamplesMs[Math.floor(sortedSamplesMs.length / 2)] ?? averageMs;
  const variance =
    samplesMs.reduce((total, sampleMs) => {
      const delta = sampleMs - averageMs;
      return total + delta * delta;
    }, 0) / samplesMs.length;
  const standardDeviationMs = Math.sqrt(variance);

  return {
    averageMs,
    medianMs,
    operationsPerSample,
    relativeStdDevPct:
      averageMs === 0 ? 0 : (standardDeviationMs / averageMs) * 100,
    sampleCount,
  };
}

function resolveOperationsPerSample(benchmark, runConfig) {
  const baseIterations = benchmark.iterations;

  if (benchmark.calibrate === false) {
    return baseIterations;
  }

  const calibrationContext = benchmark.setup?.();

  try {
    runBenchmarkIterations(
      benchmark,
      calibrationContext,
      Math.min(runConfig.warmupIterations, baseIterations),
    );

    let operationsPerSample = baseIterations;
    let durationMs = measureBenchmarkDuration(
      benchmark,
      calibrationContext,
      operationsPerSample,
    );

    while (
      durationMs < runConfig.minSampleDurationMs &&
      operationsPerSample < baseIterations * runConfig.maxCalibrationScale
    ) {
      const growthFactor = Math.min(
        16,
        Math.max(
          2,
          Math.ceil(runConfig.minSampleDurationMs / Math.max(durationMs, 0.25)),
        ),
      );
      const nextOperationsPerSample = Math.min(
        baseIterations * runConfig.maxCalibrationScale,
        operationsPerSample * growthFactor,
      );

      if (nextOperationsPerSample === operationsPerSample) {
        break;
      }

      operationsPerSample = nextOperationsPerSample;
      durationMs = measureBenchmarkDuration(
        benchmark,
        calibrationContext,
        operationsPerSample,
      );
    }

    return operationsPerSample;
  } finally {
    benchmark.teardown?.(calibrationContext);
  }
}

function measureBenchmarkDuration(benchmark, context, iterations) {
  const start = performance.now();
  runBenchmarkIterations(benchmark, context, iterations);
  return performance.now() - start;
}

function runBenchmarkIterations(benchmark, context, iterations) {
  for (let index = 0; index < iterations; index += 1) {
    benchmark.task(context);
  }
}

function createBenchmarkRunConfig(options = {}) {
  const presetName = options.preset ?? "full";
  const preset = BENCHMARK_PRESETS[presetName];

  if (!preset) {
    throw new TypeError(`Unknown benchmark preset: ${String(presetName)}.`);
  }

  return {
    ...preset,
    preset: presetName,
  };
}

function formatDuration(valueMs) {
  if (valueMs < 0.001) {
    return `${Math.round(valueMs * 1_000_000).toLocaleString("en-US")} ns/op`;
  }

  return `${valueMs.toFixed(3)} ms/op`;
}
