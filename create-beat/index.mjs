#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";

const BEAT_VERSION = "^1.0.2";
const PULSE_VERSION = "^1.0.7";
const VITE_VERSION = "^7.1.9";
const TYPESCRIPT_VERSION = "^5.3.3";
const DEFAULT_TEMPLATE = "starter";
const TEMPLATE_NAMES = [DEFAULT_TEMPLATE, "router"];
const BEAT_PACKAGE_NAME = "@ochairo/beat";
const PULSE_PACKAGE_NAME = "@ochairo/pulse";
const CREATE_BEAT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const BEAT_PACKAGE_DIRECTORY = resolve(CREATE_BEAT_DIRECTORY, "..");
const MONOREPO_ROOT_DIRECTORY = resolve(CREATE_BEAT_DIRECTORY, "../..");
const PULSE_PACKAGE_DIRECTORY = resolve(CREATE_BEAT_DIRECTORY, "../../pulse");

export async function scaffoldBeatApp(options) {
  const targetDirectory = resolve(options.targetDirectory);
  const packageName = sanitizePackageName(options.packageName);
  const template = sanitizeTemplateName(options.template);
  const existingEntries = await readDirectoryEntries(targetDirectory);

  if (existingEntries.length > 0 && !options.force) {
    throw new Error(
      `Target directory is not empty: ${targetDirectory}. Use an empty directory or pass --force.`,
    );
  }

  const files = createTemplateFiles({ packageName, targetDirectory, template });

  await Promise.all(
    Object.entries(files).map(async ([relativePath, content]) => {
      const outputPath = resolve(targetDirectory, relativePath);
      const parentPath = relativePath.includes("/")
        ? resolve(
            targetDirectory,
            relativePath.slice(0, relativePath.lastIndexOf("/")),
          )
        : targetDirectory;

      await mkdir(parentPath, { recursive: true });
      await writeFile(outputPath, content, "utf8");
    }),
  );

  return {
    packageName,
    targetDirectory,
    template,
  };
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    return;
  }

  const parsed = parseCliArguments(argv);
  const promptedTarget = parsed.target ? "" : await promptForProjectName();
  const requestedTarget =
    parsed.target ?? (promptedTarget.trim() || "beat-app");
  const resolvedTarget = resolve(process.cwd(), requestedTarget);
  const packageName = basename(resolvedTarget);

  const result = await scaffoldBeatApp({
    force: parsed.force,
    packageName,
    targetDirectory: resolvedTarget,
    template: parsed.template,
  });

  printNextSteps(result.targetDirectory, requestedTarget, result.template);
}

function parseCliArguments(argv) {
  let force = false;
  let template = DEFAULT_TEMPLATE;
  const positionalArguments = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--force") {
      force = true;
      continue;
    }

    if (argument === "--template" || argument === "-t") {
      const templateValue = argv[index + 1];

      if (!templateValue || templateValue.startsWith("-")) {
        throw new Error("Missing value for --template. Use starter or router.");
      }

      template = templateValue;
      index += 1;
      continue;
    }

    if (argument.startsWith("--template=")) {
      template = argument.slice("--template=".length);
      continue;
    }

    if (argument.startsWith("-")) {
      throw new Error(`Unknown argument: ${argument}`);
    }

    positionalArguments.push(argument);
  }

  return {
    force,
    target: positionalArguments[0],
    template: sanitizeTemplateName(template),
  };
}

async function promptForProjectName() {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return await readline.question("Project name: ");
  } finally {
    readline.close();
  }
}

function printUsage() {
  console.log(
    "Usage: pnpm create @ochairo/beat [project-name] [--template starter|router] [--force]",
  );
}

function printNextSteps(targetDirectory, requestedTarget, template) {
  const relativeTarget =
    requestedTarget === "." ? "." : basename(targetDirectory);

  console.log(`\nScaffolded Beat app in ${targetDirectory}`);
  console.log(`Template: ${template}`);
  console.log("\nNext steps:");

  if (relativeTarget !== ".") {
    console.log(`  cd ${relativeTarget}`);
  }

  console.log("  pnpm install");
  console.log("  pnpm dev");
}

async function readDirectoryEntries(targetDirectory) {
  try {
    return await readdir(targetDirectory);
  } catch (error) {
    if (isMissingDirectoryError(error)) {
      return [];
    }

    throw error;
  }
}

function isMissingDirectoryError(error) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function sanitizePackageName(value) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "beat-app"
  );
}

function sanitizeTemplateName(value = DEFAULT_TEMPLATE) {
  const normalizedValue = value.trim().toLowerCase() || DEFAULT_TEMPLATE;

  if (!TEMPLATE_NAMES.includes(normalizedValue)) {
    throw new Error(
      `Unsupported template: ${value}. Use one of ${TEMPLATE_NAMES.join(", ")}.`,
    );
  }

  return normalizedValue;
}

function createTemplateFiles({ packageName, targetDirectory, template }) {
  const baseFiles = {
    ".gitignore": createGitignore(),
    "README.md": createReadme(packageName, template),
    "index.html": createIndexHtml(packageName),
    "package.json": createPackageJson(packageName, targetDirectory),
    "tsconfig.json": createTsconfig(),
    "vite.config.ts": createViteConfig(),
    "src/main.tsx": createMainSource(),
    "src/styles.css": createStyles(),
  };

  if (template === "router") {
    return {
      ...baseFiles,
      "src/App.tsx": createRouterAppSource(),
      "src/router.tsx": createRouterSource(),
      "src/search-panel.tsx": createSearchPanelSource(),
      "src/routes/home-page.tsx": createHomePageSource(),
    };
  }

  return {
    ...baseFiles,
    "src/App.tsx": createStarterAppSource(),
  };
}

function createGitignore() {
  return ["node_modules/", "dist/", "coverage/", ".DS_Store", ""].join("\n");
}

function createReadme(packageName, template) {
  if (template === "router") {
    return [
      `# ${packageName}`,
      "",
      "Router starter scaffolded with `create-beat --template router`.",
      "",
      "## Includes",
      "",
      "- Vite configured with `createBeatVitePlugin()`",
      "- TypeScript configured for Beat's JSX runtime",
      "- Beat router setup with `Link`, `Outlet`, and route loaders",
      "- a resource example with explicit async state",
      "- starter styles and `.gitignore`",
      "",
      "## Commands",
      "",
      "```sh",
      "pnpm install",
      "pnpm dev",
      "pnpm build",
      "pnpm preview",
      "pnpm typecheck",
      "```",
      "",
      "## Project Structure",
      "",
      "- `src/main.tsx`: app mount entry",
      "- `src/App.tsx`: router shell with nav and outlet",
      "- `src/router.tsx`: route definitions and loader example",
      "- `src/routes/home-page.tsx`: home route",
      "- `src/search-panel.tsx`: explicit resource example",
      "- `src/styles.css`: starter theme and layout",
      "",
    ].join("\n");
  }

  return [
    `# ${packageName}`,
    "",
    "Starter app scaffolded with `create-beat`.",
    "",
    "## Includes",
    "",
    "- Vite configured with `createBeatVitePlugin()`",
    "- TypeScript configured for Beat's JSX runtime",
    "- a small counter app using explicit Pulse state",
    "- starter styles and `.gitignore`",
    "",
    "## Commands",
    "",
    "```sh",
    "pnpm install",
    "pnpm dev",
    "pnpm build",
    "pnpm preview",
    "pnpm typecheck",
    "```",
    "",
    "## Project Structure",
    "",
    "- `src/main.tsx`: app mount entry",
    "- `src/App.tsx`: UI shell and counter demo",
    "- `src/styles.css`: starter theme and layout",
    "",
  ].join("\n");
}

function createIndexHtml(packageName) {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${packageName}</title>`,
    "  </head>",
    "  <body>",
    '    <div id="app"></div>',
    '    <script type="module" src="/src/main.tsx"></script>',
    "  </body>",
    "</html>",
    "",
  ].join("\n");
}

function createPackageJson(packageName, targetDirectory) {
  const localWorkspacePackages = findLocalWorkspacePackages(targetDirectory);
  const dependencies = resolveDependencyVersions(
    localWorkspacePackages,
    targetDirectory,
  );
  const packageJson = {
    name: packageName,
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
      typecheck: "tsc --noEmit",
    },
    dependencies,
    devDependencies: {
      typescript: TYPESCRIPT_VERSION,
      vite: VITE_VERSION,
    },
    engines: {
      node: ">=24.0.0 <25.0.0",
      pnpm: ">=10.0.0",
    },
  };

  if (localWorkspacePackages) {
    packageJson.pnpm = {
      overrides: {
        "@ochairo/pulse": `file:${toPortableRelativePath(targetDirectory, localWorkspacePackages.pulseDirectory)}`,
      },
    };
  }

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

function resolveDependencyVersions(localWorkspacePackages, targetDirectory) {
  if (localWorkspacePackages) {
    return {
      "@ochairo/beat": `file:${toPortableRelativePath(targetDirectory, localWorkspacePackages.beatDirectory)}`,
      "@ochairo/pulse": `file:${toPortableRelativePath(targetDirectory, localWorkspacePackages.pulseDirectory)}`,
    };
  }

  return {
    "@ochairo/beat": BEAT_VERSION,
    "@ochairo/pulse": PULSE_VERSION,
  };
}

function findLocalWorkspacePackages(targetDirectory) {
  const packageDirectories = [
    findInstalledWorkspacePackages(targetDirectory),
    findPackagesFromTargetAncestors(targetDirectory),
  ];

  for (const packageDirectorySet of packageDirectories) {
    if (packageDirectorySet) {
      return packageDirectorySet;
    }
  }

  return null;
}

function findInstalledWorkspacePackages(targetDirectory) {
  if (
    !isExpectedPackageDirectory(BEAT_PACKAGE_DIRECTORY, BEAT_PACKAGE_NAME) ||
    !isExpectedPackageDirectory(PULSE_PACKAGE_DIRECTORY, PULSE_PACKAGE_NAME)
  ) {
    return null;
  }

  const relativeToRoot = relative(MONOREPO_ROOT_DIRECTORY, targetDirectory);

  if (relativeToRoot === "" || relativeToRoot.startsWith("..")) {
    return null;
  }

  return {
    beatDirectory: BEAT_PACKAGE_DIRECTORY,
    pulseDirectory: PULSE_PACKAGE_DIRECTORY,
  };
}

function findPackagesFromTargetAncestors(targetDirectory) {
  let currentDirectory = resolve(targetDirectory, "..");

  while (true) {
    const beatDirectory = resolve(currentDirectory, "beat");
    const pulseDirectory = resolve(currentDirectory, "pulse");

    if (
      isExpectedPackageDirectory(beatDirectory, BEAT_PACKAGE_NAME) &&
      isExpectedPackageDirectory(pulseDirectory, PULSE_PACKAGE_NAME)
    ) {
      return {
        beatDirectory,
        pulseDirectory,
      };
    }

    const parentDirectory = resolve(currentDirectory, "..");

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function isExpectedPackageDirectory(directoryPath, expectedPackageName) {
  const packageJsonPath = resolve(directoryPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    return packageJson.name === expectedPackageName;
  } catch {
    return false;
  }
}

function toPortableRelativePath(fromDirectory, toDirectory) {
  return relative(fromDirectory, toDirectory).split("\\").join("/");
}

function createTsconfig() {
  return [
    "{",
    '  "compilerOptions": {',
    '    "target": "ES2020",',
    '    "module": "ESNext",',
    '    "lib": ["ES2020", "DOM", "DOM.Iterable"],',
    '    "moduleResolution": "bundler",',
    '    "jsx": "react-jsx",',
    '    "jsxImportSource": "@ochairo/beat",',
    '    "strict": true,',
    '    "esModuleInterop": true,',
    '    "skipLibCheck": true,',
    '    "forceConsistentCasingInFileNames": true,',
    '    "resolveJsonModule": true,',
    '    "isolatedModules": true,',
    '    "noUnusedLocals": true,',
    '    "noUnusedParameters": true,',
    '    "noImplicitReturns": true,',
    '    "noFallthroughCasesInSwitch": true,',
    '    "exactOptionalPropertyTypes": true,',
    '    "noUncheckedIndexedAccess": true,',
    '    "noPropertyAccessFromIndexSignature": true,',
    '    "types": ["vite/client"]',
    "  },",
    '  "include": ["src/**/*.ts", "src/**/*.tsx"]',
    "}",
    "",
  ].join("\n");
}

function createViteConfig() {
  return [
    'import { defineConfig } from "vite";',
    'import { createBeatVitePlugin } from "@ochairo/beat/vite-plugin";',
    "",
    "export default defineConfig({",
    "  plugins: [createBeatVitePlugin()],",
    "});",
    "",
  ].join("\n");
}

function createStarterAppSource() {
  return [
    'import { bindText, component } from "@ochairo/beat";',
    'import { pulse } from "@ochairo/pulse";',
    "",
    "const counter = pulse(0);",
    "",
    "export const App = component(() => {",
    "  return (",
    '    <main class="app-shell">',
    '      <section class="workspace">',
    '        <header class="workspace-header">',
    "          <div>",
    '            <p class="eyebrow brand-mark">',
    '              <span aria-hidden="true" class="brand-mark__dot" />',
    "              Beat starter",
    "            </p>",
    '            <h1 class="workspace-title">Counter app</h1>',
    '            <p class="workspace-copy">A small app with room to grow.</p>',
    "          </div>",
    "        </header>",
    '        <section class="panel panel--route">',
    '          <section class="route-stack">',
    '            <p class="eyebrow">Counter</p>',
    "            <h2>Counter</h2>",
    '            <div class="panel panel--nested">',
    '              <div class="counter-panel">',
    '                <span class="counter-panel__label">Count</span>',
    '                <div class="counter-stepper">',
    '                  <button class="counter-stepper__button" onClick={() => counter.set(counter.get() - 1)}>',
    "                    -",
    "                  </button>",
    '                  <strong class="counter-stepper__value">{bindText(counter)}</strong>',
    '                  <button class="counter-stepper__button" onClick={() => counter.set(counter.get() + 1)}>',
    "                    +",
    "                  </button>",
    "                </div>",
    "              </div>",
    "            </div>",
    "          </section>",
    "        </section>",
    "      </section>",
    "    </main>",
    "  );",
    "});",
    "",
  ].join("\n");
}

function createStarterStateSource() {
  return [
    'import { pulse } from "@ochairo/pulse";',
    "",
    "export interface TaskItem {",
    "  readonly id: number;",
    "  readonly title: string;",
    "  readonly done: boolean;",
    "}",
    "",
    'export type TaskFilter = "all" | "open" | "done";',
    "",
    "const initialTasks: TaskItem[] = [",
    '  { id: 1, title: "Review onboarding flow", done: false },',
    '  { id: 2, title: "Confirm search state contract", done: true },',
    '  { id: 3, title: "Prepare release checklist", done: false },',
    "];",
    "",
    "let nextTaskId = initialTasks.length + 1;",
    "",
    'export const draft = pulse("");',
    'export const filter = pulse<TaskFilter>("all");',
    "export const tasks = pulse(initialTasks);",
    "export const visibleTasks = pulse(initialTasks);",
    "export const totalCount = pulse(initialTasks.length);",
    "export const openCount = pulse(initialTasks.filter((task) => !task.done).length);",
    "export const completedCount = pulse(initialTasks.filter((task) => task.done).length);",
    "export const hasVisibleTasks = pulse(initialTasks.length > 0);",
    "export const hasCompletedTasks = pulse(initialTasks.some((task) => task.done));",
    "export const isAllFilterActive = pulse(true);",
    "export const isOpenFilterActive = pulse(false);",
    "export const isDoneFilterActive = pulse(false);",
    "",
    "function getVisibleTasks(nextTasks: readonly TaskItem[], nextFilter: TaskFilter) {",
    '  if (nextFilter === "open") {',
    "    return nextTasks.filter((task) => !task.done);",
    "  }",
    "",
    '  if (nextFilter === "done") {',
    "    return nextTasks.filter((task) => task.done);",
    "  }",
    "",
    "  return [...nextTasks];",
    "}",
    "",
    "function syncDerivedState(nextTasks: readonly TaskItem[], nextFilter = filter.get()) {",
    "  const nextVisibleTasks = getVisibleTasks(nextTasks, nextFilter);",
    "  const nextCompletedCount = nextTasks.filter((task) => task.done).length;",
    "",
    "  visibleTasks.set(nextVisibleTasks);",
    "  totalCount.set(nextTasks.length);",
    "  completedCount.set(nextCompletedCount);",
    "  openCount.set(nextTasks.length - nextCompletedCount);",
    "  hasVisibleTasks.set(nextVisibleTasks.length > 0);",
    "  hasCompletedTasks.set(nextCompletedCount > 0);",
    '  isAllFilterActive.set(nextFilter === "all");',
    '  isOpenFilterActive.set(nextFilter === "open");',
    '  isDoneFilterActive.set(nextFilter === "done");',
    "}",
    "",
    "export function setDraft(value: string) {",
    "  draft.set(value);",
    "}",
    "",
    "export function addTask() {",
    "  const title = draft.get().trim();",
    "",
    "  if (title.length === 0) {",
    "    return;",
    "  }",
    "",
    "  const nextTasks = [",
    "    ...tasks.get(),",
    "    {",
    "      id: nextTaskId,",
    "      title,",
    "      done: false,",
    "    },",
    "  ];",
    "",
    "  nextTaskId += 1;",
    "  tasks.set(nextTasks);",
    '  draft.set("");',
    "  syncDerivedState(nextTasks);",
    "}",
    "",
    "export function toggleTask(taskId: number) {",
    "  const nextTasks = tasks.get().map((task) =>",
    "    task.id === taskId",
    "      ? {",
    "          ...task,",
    "          done: !task.done,",
    "        }",
    "      : task,",
    "  );",
    "",
    "  tasks.set(nextTasks);",
    "  syncDerivedState(nextTasks);",
    "}",
    "",
    "export function removeTask(taskId: number) {",
    "  const nextTasks = tasks.get().filter((task) => task.id !== taskId);",
    "",
    "  tasks.set(nextTasks);",
    "  syncDerivedState(nextTasks);",
    "}",
    "",
    "export function selectFilter(nextFilter: TaskFilter) {",
    "  filter.set(nextFilter);",
    "  syncDerivedState(tasks.get(), nextFilter);",
    "}",
    "",
    "export function clearCompleted() {",
    "  const nextTasks = tasks.get().filter((task) => !task.done);",
    "",
    "  tasks.set(nextTasks);",
    "  syncDerivedState(nextTasks);",
    "}",
    "",
  ].join("\n");
}

function createRouterAppSource() {
  return [
    'import { Link, Outlet, component } from "@ochairo/beat";',
    'import { router } from "./router";',
    "",
    "export const App = component(() => {",
    "  return (",
    '    <main class="app-shell">',
    '      <section class="workspace">',
    '        <header class="workspace-header">',
    "          <div>",
    '            <p class="eyebrow brand-mark">',
    '              <span aria-hidden="true" class="brand-mark__dot" />',
    "              Beat starter",
    "            </p>",
    '            <h1 class="workspace-title">Router app</h1>',
    '            <p class="workspace-copy">A small app with room to grow.</p>',
    "          </div>",
    '          <nav aria-label="Routes" class="top-nav">',
    '            <Link class="nav-link" router={router} to="/" prefetch="hover">',
    "              Counter",
    "            </Link>",
    '            <Link class="nav-link" router={router} to="/about" prefetch="hover">',
    "              About",
    "            </Link>",
    "          </nav>",
    "        </header>",
    '        <section class="panel panel--route">',
    '          <div class="route-host">',
    "            <Outlet router={router} />",
    "          </div>",
    "        </section>",
    "      </section>",
    "    </main>",
    "  );",
    "});",
    "",
  ].join("\n");
}

function createRouterSource() {
  return [
    'import { createRouter, type BeatRouteMatch } from "@ochairo/beat";',
    'import { HomePage } from "./routes/home-page";',
    "",
    "interface AboutRouteData {",
    "  readonly title: string;",
    "  readonly summary: string;",
    "  readonly notes: readonly string[];",
    "}",
    "",
    "function getAboutRouteData(match: BeatRouteMatch): AboutRouteData | undefined {",
    "  return match.data as AboutRouteData | undefined;",
    "}",
    "",
    "export const router = createRouter({",
    "  routes: [",
    "    {",
    '      path: "/",',
    "      view() {",
    "        return <HomePage />;",
    "      },",
    "    },",
    "    {",
    '      path: "/about",',
    "      async load() {",
    "        return {",
    '          title: "About Beat",',
    '          summary: "Beat is a small reactive UI library focused on direct rendering, explicit state, and predictable routing.",',
    "          notes: [",
    '            "Components stay close to the DOM.",',
    '            "Signals and resources keep updates explicit.",',
    '            "The router composes views without extra ceremony.",',
    "          ],",
    "        };",
    "      },",
    "      view(match) {",
    "        const data = getAboutRouteData(match);",
    "",
    "        return (",
    '          <section class="route-stack">',
    '            <p class="eyebrow">About</p>',
    '            <h2>{data?.title ?? "Loading route data"}</h2>',
    '            <p class="panel-copy">',
    '              {data?.summary ?? "The loader is resolving the route payload."}',
    "            </p>",
    "            {match.error ? (",
    '              <p class="status-line status-line--error">Route failed to load.</p>',
    "            ) : null}",
    '            <ul class="info-list">',
    "              {(data?.notes ?? []).map((note: string) => (",
    '                <li class="info-item">',
    "                  <strong>{note}</strong>",
    "                </li>",
    "              ))}",
    "            </ul>",
    "          </section>",
    "        );",
    "      },",
    "    },",
    "  ],",
    "});",
    "",
  ].join("\n");
}

function createHomePageSource() {
  return [
    'import { bindText, component } from "@ochairo/beat";',
    'import { pulse } from "@ochairo/pulse";',
    "",
    "const counter = pulse(0);",
    "export const HomePage = component(() => {",
    "  return (",
    '    <section class="route-stack">',
    '      <p class="eyebrow">Counter</p>',
    "      <h2>Counter</h2>",
    '      <div class="panel panel--nested">',
    '        <div class="counter-panel">',
    '          <span class="counter-panel__label">Count</span>',
    '          <div class="counter-stepper">',
    '            <button class="counter-stepper__button" onClick={() => counter.set(counter.get() - 1)}>',
    "              -",
    "            </button>",
    '            <strong class="counter-stepper__value">{bindText(counter)}</strong>',
    '            <button class="counter-stepper__button" onClick={() => counter.set(counter.get() + 1)}>',
    "              +",
    "            </button>",
    "          </div>",
    "        </div>",
    "      </div>",
    "    </section>",
    "  );",
    "});",
    "",
  ].join("\n");
}

function createSearchPanelSource() {
  return [
    'import { Show, bindText, component, createResource, onCleanup } from "@ochairo/beat";',
    'import { pulse } from "@ochairo/pulse";',
    "",
    'type SearchTopic = "beat" | "router" | "resource";',
    "",
    "interface SearchResult {",
    "  readonly heading: string;",
    "  readonly summary: string;",
    "  readonly items: readonly string[];",
    "}",
    "",
    "const resultMap: Record<SearchTopic, readonly string[]> = {",
    '  beat: ["Route shell", "Loader data", "Direct DOM updates"],',
    '  router: ["Link prefetch", "Outlet composition", "Exact route matching"],',
    '  resource: ["Explicit status", "Reload controls", "Deterministic cleanup"],',
    "};",
    "",
    "export const SearchPanel = component(() => {",
    '  const query = pulse<SearchTopic>("beat");',
    "  const resource = createResource<SearchTopic, SearchResult>({",
    "    source: query,",
    "    immediate: true,",
    "    getCacheKey(value) {",
    "      return value;",
    "    },",
    "    async load(value) {",
    '      const items = resultMap[value] ?? ["Bring your own API", "Keep async state explicit"];',
    "",
    "      return {",
    "        heading: `Results for ${value}`,",
    '        summary: "This resource stays explicit: status is visible and reload is manual.",',
    "        items,",
    "      };",
    "    },",
    "  });",
    "",
    "  onCleanup(() => {",
    "    resource.dispose();",
    "  });",
    "",
    "  return (",
    '    <section class="panel panel--nested resource-panel">',
    '      <div class="panel__title panel__title--split">',
    "        <div>",
    "          <h3>Search demo</h3>",
    "        </div>",
    '        <div class="filters">',
    '          <button class="filter-chip" onClick={() => query.set("beat")}>',
    "            Beat",
    "          </button>",
    '          <button class="filter-chip" onClick={() => query.set("router")}>',
    "            Router",
    "          </button>",
    '          <button class="filter-chip" onClick={() => query.set("resource")}>',
    "            Resource",
    "          </button>",
    '          <button class="ghost-button" onClick={() => void resource.reload()}>',
    "            Reload",
    "          </button>",
    "        </div>",
    "      </div>",
    '      <p class="status-line">Status: {bindText(resource.state.status)}</p>',
    '      <Show when={resource.state.data} fallback={<p class="panel-copy">Loading resource data.</p>}>',
    "        {(data) => (",
    "          data ? (",
    '            <div class="results-list">',
    "              <strong>{data.heading}</strong>",
    '              <ul class="info-list">',
    "                {data.items.map((item: string) => (",
    '                  <li class="info-item">',
    "                    <strong>{item}</strong>",
    "                  </li>",
    "                ))}",
    "              </ul>",
    "            </div>",
    "          ) : null",
    "        )}",
    "      </Show>",
    "    </section>",
    "  );",
    "});",
    "",
  ].join("\n");
}

function createMainSource() {
  return [
    'import { createRoot } from "@ochairo/beat";',
    'import { App } from "./App";',
    'import "./styles.css";',
    "",
    'const target = document.getElementById("app");',
    "",
    "if (!(target instanceof HTMLElement)) {",
    '  throw new Error("Missing #app mount target");',
    "}",
    "",
    "createRoot(target).render(<App />);",
    "",
  ].join("\n");
}

function createStyles() {
  return [
    ":root {",
    "  color: #ecf2ff;",
    "  background: #0b1020;",
    '  font-family: "IBM Plex Sans", "Segoe UI", sans-serif;',
    "  --bg: #0b1020;",
    "  --panel: rgba(16, 24, 42, 0.92);",
    "  --panel-soft: rgba(19, 30, 52, 0.72);",
    "  --panel-border: rgba(148, 163, 184, 0.14);",
    "  --muted: #9aa7bd;",
    "  --accent: #7dd3fc;",
    "  --success: #86efac;",
    "  --danger: #fda4af;",
    "  --shadow: 0 18px 40px rgba(0, 0, 0, 0.22);",
    "}",
    "",
    "* {",
    "  box-sizing: border-box;",
    "}",
    "",
    "body {",
    "  margin: 0;",
    "  min-height: 100vh;",
    "  background:",
    "    radial-gradient(circle at top left, rgba(125, 211, 252, 0.12), transparent 24%),",
    "    var(--bg);",
    "}",
    "",
    "button,",
    "input,",
    "a {",
    "  font: inherit;",
    "}",
    "",
    "#app,",
    ".app-shell {",
    "  min-height: 100vh;",
    "}",
    "",
    ".workspace {",
    "  width: min(920px, calc(100vw - 32px));",
    "  margin: 0 auto;",
    "  padding: 32px 0 56px;",
    "  display: grid;",
    "  gap: 16px;",
    "}",
    "",
    ".eyebrow {",
    "  margin: 0 0 10px;",
    "  color: var(--accent);",
    "  font-size: 0.82rem;",
    "  font-weight: 700;",
    "  letter-spacing: 0.14em;",
    "  text-transform: uppercase;",
    "}",
    "",
    ".brand-mark {",
    "  display: inline-flex;",
    "  align-items: center;",
    "  gap: 0.55rem;",
    "}",
    "",
    ".brand-mark__dot {",
    "  width: 0.65rem;",
    "  height: 0.65rem;",
    "  border-radius: 50%;",
    "  background: var(--accent);",
    "  box-shadow: 0 0 0 0 rgba(125, 211, 252, 0.45);",
    "  animation: pulse-ring 2.2s infinite;",
    "}",
    "",
    "h1,",
    "h2,",
    "h3,",
    "p,",
    "ul {",
    "  margin: 0;",
    "}",
    "",
    ".workspace-title {",
    "  font-size: clamp(1.8rem, 3vw, 2.4rem);",
    "  line-height: 1.1;",
    "}",
    "",
    ".workspace-copy,",
    ".panel-copy,",
    ".status-line {",
    "  color: var(--muted);",
    "  line-height: 1.5;",
    "}",
    "",
    ".panel {",
    "  border: 1px solid var(--panel-border);",
    "  border-radius: 20px;",
    "  background: var(--panel);",
    "  box-shadow: var(--shadow);",
    "  padding: 16px;",
    "}",
    "",
    ".panel--nested {",
    "  background: var(--panel-soft);",
    "}",
    "",
    ".workspace-header,",
    ".panel__title,",
    ".panel__title--split,",
    ".toolbar,",
    ".inline-row,",
    ".top-nav {",
    "  display: flex;",
    "  flex-wrap: wrap;",
    "  gap: 12px;",
    "  align-items: center;",
    "  justify-content: space-between;",
    "}",
    "",
    ".panel__title p {",
    "  margin-top: 4px;",
    "  color: var(--muted);",
    "}",
    "",
    ".nav-link {",
    "  display: inline-flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  min-height: 38px;",
    "  padding: 0 14px;",
    "  border-radius: 999px;",
    "  border: 1px solid rgba(148, 163, 184, 0.14);",
    "  background: rgba(15, 23, 42, 0.72);",
    "  color: inherit;",
    "  cursor: pointer;",
    "  text-decoration: none;",
    "}",
    "",
    ".nav-link:hover {",
    "  border-color: rgba(125, 211, 252, 0.28);",
    "  background: rgba(125, 211, 252, 0.1);",
    "}",
    "",
    ".composer {",
    "  display: grid;",
    "  grid-template-columns: minmax(0, 1fr) auto;",
    "  gap: 12px;",
    "}",
    "",
    ".composer__input {",
    "  width: 100%;",
    "  border: 1px solid rgba(148, 163, 184, 0.18);",
    "  border-radius: 14px;",
    "  padding: 12px 14px;",
    "  color: inherit;",
    "  background: rgba(15, 23, 42, 0.78);",
    "}",
    "",
    ".filters {",
    "  display: flex;",
    "  flex-wrap: wrap;",
    "  gap: 10px;",
    "}",
    "",
    ".filter-chip {",
    "  border: 1px solid rgba(148, 163, 184, 0.16);",
    "  border-radius: 999px;",
    "  padding: 8px 12px;",
    "  color: var(--muted);",
    "  background: rgba(15, 23, 42, 0.78);",
    "  cursor: pointer;",
    "}",
    "",
    ".filter-chip--active {",
    "  color: #04111b;",
    "  background: var(--accent);",
    "  border-color: transparent;",
    "}",
    "",
    ".primary-button,",
    ".ghost-button,",
    ".task-toggle,",
    ".counter-stepper__button {",
    "  border-radius: 14px;",
    "  padding: 10px 14px;",
    "  font-weight: 700;",
    "  cursor: pointer;",
    "}",
    "",
    ".primary-button {",
    "  border: 0;",
    "  color: #04111b;",
    "  background: var(--accent);",
    "}",
    "",
    ".ghost-button,",
    ".task-toggle,",
    ".counter-stepper__button {",
    "  border: 1px solid rgba(148, 163, 184, 0.18);",
    "  color: inherit;",
    "  background: rgba(15, 23, 42, 0.78);",
    "}",
    "",
    ".counter-panel {",
    "  width: 100%;",
    "  display: grid;",
    "  gap: 14px;",
    "  padding: 22px;",
    "}",
    "",
    ".counter-panel__label {",
    "  color: var(--muted);",
    "  font-size: 0.9rem;",
    "  letter-spacing: 0.08em;",
    "  text-transform: uppercase;",
    "}",
    "",
    ".counter-stepper {",
    "  display: grid;",
    "  grid-template-columns: 64px minmax(0, 1fr) 64px;",
    "  gap: 12px;",
    "  align-items: center;",
    "}",
    "",
    ".counter-stepper__button {",
    "  min-height: 64px;",
    "  font-size: 2rem;",
    "  line-height: 1;",
    "}",
    "",
    ".counter-stepper__value {",
    "  font-size: clamp(2.8rem, 12vw, 4.8rem);",
    "  line-height: 1;",
    "  text-align: center;",
    "}",
    "",
    ".ghost-button--danger {",
    "  color: var(--danger);",
    "}",
    "",
    ".task-toggle {",
    "  min-width: 76px;",
    "  border-radius: 999px;",
    "}",
    "",
    ".task-toggle--done {",
    "  color: #07150c;",
    "  background: var(--success);",
    "  border-color: transparent;",
    "}",
    "",
    ".task-list,",
    ".info-list,",
    ".route-host,",
    ".route-stack,",
    ".results-list,",
    ".empty-panel {",
    "  display: grid;",
    "  gap: 10px;",
    "  margin: 0;",
    "  padding: 0;",
    "  list-style: none;",
    "}",
    "",
    ".task-row {",
    "  display: grid;",
    "  grid-template-columns: auto minmax(0, 1fr) auto;",
    "  gap: 12px;",
    "  align-items: center;",
    "  padding: 14px;",
    "  border: 1px solid rgba(148, 163, 184, 0.14);",
    "  border-radius: 16px;",
    "  background: rgba(15, 23, 42, 0.82);",
    "}",
    "",
    ".task-row--done .task-copy strong {",
    "  color: var(--muted);",
    "  text-decoration: line-through;",
    "}",
    "",
    ".task-copy strong,",
    ".info-item strong {",
    "  display: block;",
    "}",
    "",
    ".info-item {",
    "  display: grid;",
    "  gap: 4px;",
    "  padding: 14px;",
    "  border-radius: 16px;",
    "  border: 1px solid rgba(148, 163, 184, 0.12);",
    "  background: rgba(15, 23, 42, 0.78);",
    "}",
    "",
    ".status-line--error {",
    "  color: var(--danger);",
    "}",
    "",
    "@keyframes pulse-ring {",
    "  0% {",
    "    box-shadow: 0 0 0 0 rgba(125, 211, 252, 0.45);",
    "  }",
    "",
    "  70% {",
    "    box-shadow: 0 0 0 12px rgba(125, 211, 252, 0);",
    "  }",
    "",
    "  100% {",
    "    box-shadow: 0 0 0 0 rgba(125, 211, 252, 0);",
    "  }",
    "}",
    "",
    "@media (max-width: 640px) {",
    "  .workspace {",
    "    width: min(100vw - 20px, 920px);",
    "    padding: 20px 0 32px;",
    "  }",
    "",
    "  .workspace-header,",
    "  .panel__title,",
    "  .panel__title--split,",
    "  .toolbar,",
    "  .inline-row,",
    "  .composer,",
    "  .task-row {",
    "    grid-template-columns: 1fr;",
    "  }",
    "}",
    "",
  ].join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message =
      error instanceof Error ? error.message : "Unknown create-beat failure";
    console.error(message);
    process.exitCode = 1;
  });
}
