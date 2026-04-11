/// <reference path="./playwright-test.d.ts" />

import { expect, test } from "@playwright/test";

type SamplePath = "/beat/" | "/react/" | "/solid/";
type SurfaceMode = "table" | "cards" | "editor";
type ScenarioMetrics = {
  readonly writeMs: number;
  readonly visualMs: number;
  readonly totalMs: number;
};

const SAMPLE_PATHS: readonly SamplePath[] = ["/beat/", "/react/", "/solid/"];
const SURFACE_MODES: readonly SurfaceMode[] = ["table", "cards", "editor"];

const ITERATIONS = 5;

type SampleResult = {
  readonly path: SamplePath;
  readonly surface: SurfaceMode;
  readonly batchedSweep: ScenarioMetrics;
  readonly firstRowChange: ScenarioMetrics;
  readonly writeStorm: ScenarioMetrics;
  readonly focusShift: ScenarioMetrics;
};

async function readMetricText(
  page: import("@playwright/test").Page,
  label: string,
): Promise<string> {
  const card = page.locator(".metric-card").filter({ hasText: label }).first();
  await expect(card).toBeVisible();
  const value = card.locator(".metric-card__value");
  return (await value.textContent())?.trim() ?? "";
}

function parseMilliseconds(value: string): number {
  return Number.parseFloat(value.replace("ms", "").trim());
}

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function averageScenarioMetrics(
  values: readonly ScenarioMetrics[],
): ScenarioMetrics {
  return {
    writeMs: average(values.map((value) => value.writeMs)),
    visualMs: average(values.map((value) => value.visualMs)),
    totalMs: average(values.map((value) => value.totalMs)),
  };
}

function rotateSamplePaths(iteration: number): readonly SamplePath[] {
  const offset = iteration % SAMPLE_PATHS.length;
  return SAMPLE_PATHS.map(
    (_, index) => SAMPLE_PATHS[(index + offset) % SAMPLE_PATHS.length],
  );
}

function getFocusShiftTarget(
  page: import("@playwright/test").Page,
  surface: SurfaceMode,
) {
  if (surface === "table") {
    return page.locator(".order-book__row").nth(1);
  }

  if (surface === "cards") {
    return page.locator(".market-card").nth(1);
  }

  return page.locator(".market-editor").nth(1);
}

async function runScenario(
  page: import("@playwright/test").Page,
  path: SamplePath,
  surface: SurfaceMode,
): Promise<SampleResult> {
  await page.goto(`${path}bench.html?rows=2000&surface=${surface}`);
  await expect(
    page.locator(".order-book__row, .market-card, .market-editor").first(),
  ).toBeVisible();

  const runControl = async (label: string): Promise<ScenarioMetrics> => {
    const previousWrite = await readMetricText(page, "Last write burst");
    const previousTotal = await readMetricText(page, "Last total burst");

    await page.getByRole("button", { name: new RegExp(label, "i") }).click();

    await expect
      .poll(async () => {
        const nextWrite = await readMetricText(page, "Last write burst");
        const nextTotal = await readMetricText(page, "Last total burst");
        return `${nextWrite}|${nextTotal}`;
      })
      .not.toBe(`${previousWrite}|${previousTotal}`);

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

  const batchedSweep = await runControl("Run batched sweep");
  const firstRowChange = await runControl("Run first-row change");
  const writeStorm = await runControl("Run write storm");
  const focusShift = await (async (): Promise<ScenarioMetrics> => {
    const previousWrite = await readMetricText(page, "Last write burst");
    const previousTotal = await readMetricText(page, "Last total burst");

    await getFocusShiftTarget(page, surface).hover();

    await expect
      .poll(async () => {
        const nextWrite = await readMetricText(page, "Last write burst");
        const nextTotal = await readMetricText(page, "Last total burst");
        return `${nextWrite}|${nextTotal}`;
      })
      .not.toBe(`${previousWrite}|${previousTotal}`);

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
  })();

  return {
    path,
    surface,
    batchedSweep,
    firstRowChange,
    writeStorm,
    focusShift,
  };
}

async function runComparison(
  page: import("@playwright/test").Page,
): Promise<readonly SampleResult[]> {
  const averagedResults: SampleResult[] = [];

  for (const surface of SURFACE_MODES) {
    const runsByPath = new Map<SamplePath, SampleResult[]>(
      SAMPLE_PATHS.map((path) => [path, []]),
    );

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
}

test("compares Beat, React, and Solid sample timings", async ({ page }) => {
  const results = await runComparison(page);

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

  expect(results).toHaveLength(SAMPLE_PATHS.length * SURFACE_MODES.length);

  for (const result of results) {
    for (const scenario of [
      result.batchedSweep,
      result.firstRowChange,
      result.writeStorm,
      result.focusShift,
    ]) {
      expect(Number.isFinite(scenario.writeMs)).toBe(true);
      expect(Number.isFinite(scenario.visualMs)).toBe(true);
      expect(Number.isFinite(scenario.totalMs)).toBe(true);
      expect(scenario.writeMs).toBeGreaterThanOrEqual(0);
      expect(scenario.visualMs).toBeGreaterThan(0);
      expect(scenario.totalMs).toBeGreaterThan(0);
      expect(scenario.totalMs).toBeGreaterThanOrEqual(scenario.writeMs);
    }
  }
});
