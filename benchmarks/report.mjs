import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBeatBenchmarkSuite } from "./runtime.mjs";

const REPORT_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "./runtime-report.md",
);

async function main() {
  const suite = runBeatBenchmarkSuite({ quiet: true });
  const reportText = renderGeneratedResultsBlock(suite);

  await writeFile(REPORT_PATH, reportText, "utf8");
  console.log(`Wrote ${REPORT_PATH}`);
}

function renderGeneratedResultsBlock(suite) {
  const lines = [
    "# Beat Runtime Benchmark Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  for (const section of suite.sections) {
    const hasMultipleCases = section.rankedCases.length > 1;
    const fastest = section.rankedCases[0];

    lines.push(`### ${section.title}`, "");
    if (hasMultipleCases && fastest) {
      lines.push(
        `Fastest median path: **${fastest.name}** at **${formatDuration(getBenchmarkScore(fastest))}**.`,
        "",
      );
    }

    if (hasMultipleCases) {
      lines.push(
        "| Benchmark | Median | Mean | RSD | Samples | Ops/Sample | Base Ops | Compared With Fastest |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
      );
    } else {
      lines.push(
        "| Benchmark | Median | Mean | RSD | Samples | Ops/Sample | Base Ops |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
      );
    }

    for (const result of section.rankedCases) {
      const baseColumns = `| ${result.name} | ${formatDuration(getBenchmarkScore(result))} | ${formatDuration(result.averageMs)} | ${formatPercent(result.relativeStdDevPct ?? 0)} | ${(result.sampleCount ?? 1).toLocaleString("en-US")} | ${result.iterations.toLocaleString("en-US")} | ${(result.configuredIterations ?? result.iterations).toLocaleString("en-US")}`;

      lines.push(
        hasMultipleCases
          ? `${baseColumns} | ${result.rank === 1 ? "fastest" : `${result.relativeToFastest.toFixed(2)}x slower`} |`
          : `${baseColumns} |`,
      );
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

function formatDuration(valueMs) {
  if (valueMs < 0.001) {
    return `${Math.round(valueMs * 1_000_000).toLocaleString("en-US")} ns/op`;
  }

  return `${valueMs.toFixed(3)} ms/op`;
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function getBenchmarkScore(result) {
  return result.medianMs ?? result.averageMs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
