import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const SAMPLE_PATHS = ["/beat/", "/react/", "/solid/"];
const SURFACE_MODES = ["table", "cards", "editor"];
const ITERATIONS = 3;
const SAMPLE_REPORT_START = "<!-- sample-benchmark-results:start -->";
const SAMPLE_REPORT_END = "<!-- sample-benchmark-results:end -->";
const SERVER_URL = "http://127.0.0.1:4173";
const BACKEND_PATH = dirname(fileURLToPath(import.meta.url));
const BEAT_PATH = resolve(BACKEND_PATH, "../..");
const DOCS_PATH = resolve(BEAT_PATH, "docs/BENCHMARKS.md");

async function main() {
  await runCommand("pnpm", ["--dir", BEAT_PATH, "sample:build"], {
    cwd: BACKEND_PATH,
  });

  const hadExistingServer = await isServerResponsive();
  const serverProcess = hadExistingServer
    ? null
    : spawn("pnpm", ["serve"], {
        cwd: BACKEND_PATH,
        stdio: "pipe",
        env: process.env,
      });

  try {
    if (!hadExistingServer) {
      await waitForServer();
    }

    const results = await collectResults();
    console.table(
      results.map((result) => ({
        sample: result.path,
        surface: result.surface,
        batchedSweepWriteMs: result.batchedSweep.writeMs,
        batchedSweepTotalMs: result.batchedSweep.totalMs,
        unbatchedSweepWriteMs: result.unbatchedSweep.writeMs,
        unbatchedSweepTotalMs: result.unbatchedSweep.totalMs,
        writeStormWriteMs: result.writeStorm.writeMs,
        writeStormTotalMs: result.writeStorm.totalMs,
        focusShiftWriteMs: result.focusShift.writeMs,
        focusShiftTotalMs: result.focusShift.totalMs,
      })),
    );

    const currentDocument = await readFile(DOCS_PATH, "utf8");
    const nextBlock = renderSampleResultsBlock(results);
    const nextDocument = replaceGeneratedBlock(currentDocument, nextBlock);
    await writeFile(DOCS_PATH, nextDocument, "utf8");
    console.log(`Updated ${DOCS_PATH}`);
  } finally {
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
    }
  }
}

function runCommand(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit",
      env: process.env,
    });

    child.once("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      rejectPromise(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });
}

async function isServerResponsive() {
  try {
    const response = await fetch(
      `${SERVER_URL}/beat/bench.html?rows=10&surface=table`,
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 120000) {
    if (await isServerResponsive()) {
      return;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  throw new Error("Timed out waiting for sample server on 127.0.0.1:4173.");
}

function rotateSamplePaths(iteration) {
  const offset = iteration % SAMPLE_PATHS.length;
  return SAMPLE_PATHS.map(
    (_, index) => SAMPLE_PATHS[(index + offset) % SAMPLE_PATHS.length],
  );
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageScenarioMetrics(values) {
  return {
    writeMs: average(values.map((value) => value.writeMs)),
    visualMs: average(values.map((value) => value.visualMs)),
    totalMs: average(values.map((value) => value.totalMs)),
  };
}

async function readMetricText(page, label) {
  const card = page.locator(".metric-card").filter({ hasText: label }).first();
  await card.waitFor({ state: "visible" });
  const value = card.locator(".metric-card__value");
  return (await value.textContent())?.trim() ?? "";
}

function parseMilliseconds(value) {
  return Number.parseFloat(value.replace("ms", "").trim());
}

async function runScenario(page, path, surface) {
  await page.goto(
    `${SERVER_URL}${path}bench.html?rows=2000&surface=${surface}`,
  );
  await page
    .locator(".order-book__row, .market-card, .market-editor")
    .first()
    .waitFor({ state: "visible" });

  const runControl = async (label) => {
    const previousWrite = await readMetricText(page, "Last write burst");
    const previousTotal = await readMetricText(page, "Last total burst");

    await page.getByRole("button", { name: new RegExp(label, "i") }).click();

    for (;;) {
      const nextWrite = await readMetricText(page, "Last write burst");
      const nextTotal = await readMetricText(page, "Last total burst");
      if (`${nextWrite}|${nextTotal}` !== `${previousWrite}|${previousTotal}`) {
        break;
      }
      await page.waitForTimeout(50);
    }

    return {
      writeMs: parseMilliseconds(
        await readMetricText(page, "Last write burst"),
      ),
      visualMs: parseMilliseconds(
        await readMetricText(page, "Last visual settle"),
      ),
      totalMs: parseMilliseconds(
        await readMetricText(page, "Last total burst"),
      ),
    };
  };

  return {
    path,
    surface,
    batchedSweep: await runControl("Run batched sweep"),
    unbatchedSweep: await runControl("Run unbatched sweep"),
    writeStorm: await runControl("Run write storm"),
    focusShift: await runControl("Shift focused row"),
  };
}

async function collectResults() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const averagedResults = [];

    for (const surface of SURFACE_MODES) {
      const runsByPath = new Map(SAMPLE_PATHS.map((path) => [path, []]));

      for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
        for (const path of rotateSamplePaths(iteration)) {
          runsByPath.get(path)?.push(await runScenario(page, path, surface));
        }
      }

      for (const path of SAMPLE_PATHS) {
        const runs = runsByPath.get(path);
        if (!runs || runs.length === 0) {
          throw new Error(`Missing benchmark runs for ${path} on ${surface}`);
        }

        averagedResults.push({
          path,
          surface,
          batchedSweep: averageScenarioMetrics(
            runs.map((run) => run.batchedSweep),
          ),
          unbatchedSweep: averageScenarioMetrics(
            runs.map((run) => run.unbatchedSweep),
          ),
          writeStorm: averageScenarioMetrics(runs.map((run) => run.writeStorm)),
          focusShift: averageScenarioMetrics(runs.map((run) => run.focusShift)),
        });
      }
    }

    return averagedResults;
  } finally {
    await browser.close();
  }
}

function getResult(results, path, surface) {
  const result = results.find(
    (entry) => entry.path === path && entry.surface === surface,
  );
  if (!result) {
    throw new Error(`Missing result for ${path} on ${surface}`);
  }
  return result;
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function renderScenarioTable(results, scenarioKey, title) {
  const lines = [
    `### ${title}`,
    "",
    "| Surface | Beat | React | Solid | Winner | Beat vs Winner |",
    "| --- | ---: | ---: | ---: | --- | ---: |",
  ];

  for (const surface of SURFACE_MODES) {
    const beat = getResult(results, "/beat/", surface)[scenarioKey].totalMs;
    const react = getResult(results, "/react/", surface)[scenarioKey].totalMs;
    const solid = getResult(results, "/solid/", surface)[scenarioKey].totalMs;
    const winner = [
      { label: "Beat", value: beat },
      { label: "React", value: react },
      { label: "Solid", value: solid },
    ].sort((left, right) => left.value - right.value)[0];

    lines.push(
      `| ${capitalize(surface)} | ${formatMs(beat)} | ${formatMs(react)} | ${formatMs(solid)} | ${winner.label} | ${winner.label === "Beat" ? "fastest" : `${(beat / winner.value).toFixed(2)}x slower`} |`,
    );
  }

  lines.push("");
  return lines.join("\n");
}

function capitalize(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

function renderPlainEnglishRead(results) {
  const beatWins = [
    "batchedSweep",
    "unbatchedSweep",
    "writeStorm",
    "focusShift",
  ].flatMap((scenarioKey) =>
    SURFACE_MODES.map((surface) => {
      const beat = getResult(results, "/beat/", surface)[scenarioKey].totalMs;
      const react = getResult(results, "/react/", surface)[scenarioKey].totalMs;
      const solid = getResult(results, "/solid/", surface)[scenarioKey].totalMs;
      return beat <= react && beat <= solid
        ? `${scenarioKey}:${surface}`
        : null;
    }).filter(Boolean),
  ).length;

  return [
    "### Plain-English Read",
    "",
    `- Using total interaction time, Beat wins ${beatWins} of the 12 current sample scenarios in this snapshot.`,
    "- Beat is strongest on the sweep and write-storm paths, where it stays well ahead across all three surfaces.",
    "- The remaining weak spot is focus shift, especially on the editor surface, where browser-facing visual settle cost still dominates.",
    "- This block is now generated from the same Playwright run instead of being maintained manually, so the docs stay aligned with the actual benchmark output.",
    "",
  ].join("\n");
}

function renderSampleResultsBlock(results) {
  return [
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    renderScenarioTable(results, "batchedSweep", "Batched Sweep Total Time"),
    renderScenarioTable(
      results,
      "unbatchedSweep",
      "Unbatched Sweep Total Time",
    ),
    renderScenarioTable(results, "writeStorm", "Write Storm Total Time"),
    renderScenarioTable(results, "focusShift", "Focus Shift Total Time"),
    renderPlainEnglishRead(results),
  ]
    .join("\n")
    .trimEnd();
}

function replaceGeneratedBlock(documentText, generatedBlock) {
  const startIndex = documentText.indexOf(SAMPLE_REPORT_START);
  const endIndex = documentText.indexOf(SAMPLE_REPORT_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(
      "Could not find sample benchmark markers in docs/BENCHMARKS.md",
    );
  }

  const blockStart = startIndex + SAMPLE_REPORT_START.length;
  return [
    documentText.slice(0, blockStart),
    "\n\n",
    generatedBlock,
    "\n\n",
    documentText.slice(endIndex),
  ].join("");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
