import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runBeatBenchmarkSuite } from "./runtime.mjs";

const REPORT_START = "<!-- benchmark-results:start -->";
const REPORT_END = "<!-- benchmark-results:end -->";

async function main() {
  const suite = runBeatBenchmarkSuite({ quiet: true });
  const docsPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../docs/BENCHMARKS.md",
  );
  const currentDocument = await readFile(docsPath, "utf8");
  const nextBlock = renderGeneratedResultsBlock(suite);
  const nextDocument = replaceGeneratedBlock(currentDocument, nextBlock);

  await writeFile(docsPath, nextDocument, "utf8");
  console.log(`Updated ${docsPath}`);
}

function replaceGeneratedBlock(documentText, nextBlock) {
  const startIndex = documentText.indexOf(REPORT_START);
  const endIndex = documentText.indexOf(REPORT_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new TypeError(
      "Benchmark results markers are missing from docs/BENCHMARKS.md.",
    );
  }

  const before = documentText.slice(0, startIndex + REPORT_START.length);
  const after = documentText.slice(endIndex);
  return `${before}\n${nextBlock}\n${after}`;
}

function renderGeneratedResultsBlock(suite) {
  const lines = ["", `Generated: ${new Date().toISOString()}`, ""];

  for (const section of suite.sections) {
    const fastest = section.rankedCases[0];
    const slowest = section.rankedCases[section.rankedCases.length - 1];

    lines.push(`### ${section.title}`, "");
    if (fastest && slowest) {
      lines.push(
        `Fastest path: **${fastest.name}** at **${formatDuration(fastest.averageMs)}**.`,
        `Slowest path in this section: **${slowest.name}** at **${formatDuration(slowest.averageMs)}**.`,
        "",
      );
    }

    lines.push(
      "| Benchmark | Time/op | Compared With Fastest | Reading | Iterations |",
      "| --- | ---: | ---: | --- | ---: |",
    );

    for (const result of section.rankedCases) {
      lines.push(
        `| ${result.name} | ${formatDuration(result.averageMs)} | ${result.rank === 1 ? "fastest" : `${result.relativeToFastest.toFixed(2)}x slower`} | ${describeRelativeSpeed(result)} | ${result.iterations.toLocaleString("en-US")} |`,
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

function describeRelativeSpeed(result) {
  if (result.rank === 1) {
    return "Best result in this section";
  }

  if (result.relativeToFastest <= 1.5) {
    return "Close to the fastest result";
  }

  if (result.relativeToFastest <= 3) {
    return "Noticeably slower, but still in the same tier";
  }

  return "Meaningfully slower than the fastest path";
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
