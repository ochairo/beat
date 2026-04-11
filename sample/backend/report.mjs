import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const SAMPLE_PATHS = ["/beat/", "/react/", "/solid/"];
const SURFACE_MODES = ["table", "cards", "editor"];
const ITERATIONS = 5;
const SERVER_URL = "http://127.0.0.1:4173";
const BACKEND_PATH = dirname(fileURLToPath(import.meta.url));
const BEAT_PATH = resolve(BACKEND_PATH, "../..");
const REPORT_PATH = resolve(BEAT_PATH, "benchmarks/sample-comparison.md");
const SCENARIO_KEYS = [
  "batchedSweep",
  "firstRowChange",
  "writeStorm",
  "focusShift",
];

async function main() {
  const hadExistingServer = await isServerResponsive();
  const serverProcess = hadExistingServer
    ? null
    : spawn("pnpm", ["benchmark:serve"], {
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
        firstRowChangeWriteMs: result.firstRowChange.writeMs,
        firstRowChangeTotalMs: result.firstRowChange.totalMs,
        writeStormWriteMs: result.writeStorm.writeMs,
        writeStormTotalMs: result.writeStorm.totalMs,
        focusShiftWriteMs: result.focusShift.writeMs,
        focusShiftTotalMs: result.focusShift.totalMs,
      })),
    );

    const reportText = renderSampleResultsBlock(results);
    await writeFile(REPORT_PATH, reportText, "utf8");
    console.log(`Wrote ${REPORT_PATH}`);
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
    const response = await fetch(`${SERVER_URL}/health`);
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
    firstRowChange: await runControl("Run first-row change"),
    writeStorm: await runControl("Run write storm"),
    focusShift: await runHoverScenario(page, surface),
  };
}

async function runHoverScenario(page, surface) {
  const previousWrite = await readMetricText(page, "Last write burst");
  const previousTotal = await readMetricText(page, "Last total burst");
  const targetSelector =
    surface === "table"
      ? ".order-book__row"
      : surface === "cards"
        ? ".market-card"
        : ".market-editor";

  await page.locator(targetSelector).nth(1).hover();

  for (;;) {
    const nextWrite = await readMetricText(page, "Last write burst");
    const nextTotal = await readMetricText(page, "Last total burst");
    if (`${nextWrite}|${nextTotal}` !== `${previousWrite}|${previousTotal}`) {
      break;
    }
    await page.waitForTimeout(50);
  }

  return {
    writeMs: parseMilliseconds(await readMetricText(page, "Last write burst")),
    visualMs: parseMilliseconds(
      await readMetricText(page, "Last visual settle"),
    ),
    totalMs: parseMilliseconds(await readMetricText(page, "Last total burst")),
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
          firstRowChange: averageScenarioMetrics(
            runs.map((run) => run.firstRowChange),
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

function getMetricValue(results, path, surface, scenarioKey, metricKey) {
  return getResult(results, path, surface)[scenarioKey][metricKey];
}

function renderScenarioTable(results, scenarioKey, metricKey, title) {
  const lines = [
    `### ${title}`,
    "",
    "| Surface | Beat | React | Solid | Winner | Beat vs Winner |",
    "| --- | ---: | ---: | ---: | --- | ---: |",
  ];

  for (const surface of SURFACE_MODES) {
    const beat = getMetricValue(
      results,
      "/beat/",
      surface,
      scenarioKey,
      metricKey,
    );
    const react = getMetricValue(
      results,
      "/react/",
      surface,
      scenarioKey,
      metricKey,
    );
    const solid = getMetricValue(
      results,
      "/solid/",
      surface,
      scenarioKey,
      metricKey,
    );
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

function formatScenarioLabel(scenarioKey) {
  return scenarioKey
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());
}

function buildScenarioEntries(results, metricKey) {
  return SCENARIO_KEYS.flatMap((scenarioKey) =>
    SURFACE_MODES.map((surface) => {
      const beat = getMetricValue(
        results,
        "/beat/",
        surface,
        scenarioKey,
        metricKey,
      );
      const react = getMetricValue(
        results,
        "/react/",
        surface,
        scenarioKey,
        metricKey,
      );
      const solid = getMetricValue(
        results,
        "/solid/",
        surface,
        scenarioKey,
        metricKey,
      );
      const winner = [
        { label: "Beat", value: beat },
        { label: "React", value: react },
        { label: "Solid", value: solid },
      ].sort((left, right) => left.value - right.value)[0];

      return {
        beat,
        scenarioKey,
        surface,
        winner,
      };
    }),
  );
}

function renderSummaryLines(results, metricKey, label, interpretation) {
  const scenarioEntries = buildScenarioEntries(results, metricKey);
  const beatWins = scenarioEntries.filter(
    (entry) => entry.winner.label === "Beat",
  ).length;
  const scenarioWinCounts = new Map(
    SCENARIO_KEYS.map((scenarioKey) => [scenarioKey, 0]),
  );

  for (const entry of scenarioEntries) {
    if (entry.winner.label !== "Beat") {
      continue;
    }

    scenarioWinCounts.set(
      entry.scenarioKey,
      (scenarioWinCounts.get(entry.scenarioKey) ?? 0) + 1,
    );
  }

  const strongestScenario = [...scenarioWinCounts.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0] ?? ["batchedSweep", 0];
  const weakestEntry = scenarioEntries
    .filter((entry) => entry.winner.label !== "Beat")
    .sort(
      (left, right) =>
        right.beat / right.winner.value - left.beat / left.winner.value,
    )[0];

  const strongestLine =
    strongestScenario[1] > 0
      ? `- Beat is currently strongest on ${formatScenarioLabel(strongestScenario[0]).toLowerCase()}, where it leads ${strongestScenario[1]} of the 3 surfaces in this snapshot.`
      : "- Beat does not currently lead any full scenario family in this snapshot.";
  const weakestLine = weakestEntry
    ? `- The largest remaining gap is ${formatScenarioLabel(weakestEntry.scenarioKey).toLowerCase()} on the ${weakestEntry.surface} surface, where Beat is ${(weakestEntry.beat / weakestEntry.winner.value).toFixed(2)}x slower than ${weakestEntry.winner.label}.`
    : "- Beat currently holds the lead across all measured sample scenarios in this snapshot.";

  return [
    `#### ${label}`,
    "",
    `- Using ${interpretation}, Beat wins ${beatWins} of the 12 current sample scenarios in this snapshot.`,
    strongestLine,
    weakestLine,
    "",
  ].join("\n");
}

function renderPlainEnglishRead(results) {
  return [
    "### Plain-English Read",
    "",
    "This sample report now separates responsiveness from completion:",
    "",
    renderSummaryLines(
      results,
      "writeMs",
      "Responsiveness",
      "synchronous write burst",
    ).trimEnd(),
    "",
    renderSummaryLines(
      results,
      "totalMs",
      "Completion",
      "total interaction time",
    ).trimEnd(),
    "- This block is now generated from the same Playwright run instead of being maintained manually, so the docs stay aligned with the actual benchmark output.",
    "",
  ].join("\n");
}

function renderSampleResultsBlock(results) {
  return [
    "# Beat Sample Benchmark Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    renderScenarioTable(
      results,
      "firstRowChange",
      "writeMs",
      "First-Row Change Write Burst",
    ),
    renderScenarioTable(
      results,
      "batchedSweep",
      "writeMs",
      "Batched Sweep Write Burst",
    ),
    renderScenarioTable(
      results,
      "writeStorm",
      "writeMs",
      "Write Storm Write Burst",
    ),
    renderScenarioTable(
      results,
      "focusShift",
      "writeMs",
      "Focus Shift Write Burst",
    ),
    renderScenarioTable(
      results,
      "batchedSweep",
      "totalMs",
      "Batched Sweep Total Time",
    ),
    renderScenarioTable(
      results,
      "firstRowChange",
      "totalMs",
      "First-Row Change Total Time",
    ),
    renderScenarioTable(
      results,
      "writeStorm",
      "totalMs",
      "Write Storm Total Time",
    ),
    renderScenarioTable(
      results,
      "focusShift",
      "totalMs",
      "Focus Shift Total Time",
    ),
    renderPlainEnglishRead(results),
  ]
    .join("\n")
    .trimEnd();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
