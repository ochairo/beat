import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { scaffoldBeatApp } from "../create-beat/index.mjs";

const createdDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    createdDirectories
      .splice(0)
      .map((directoryPath) =>
        rm(directoryPath, { force: true, recursive: true }),
      ),
  );
});

describe("create-beat", () => {
  it("scaffolds a Beat app with the expected starter files", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "create-beat-"));
    createdDirectories.push(tempRoot);
    const targetDirectory = join(tempRoot, "tea-board");

    const result = await scaffoldBeatApp({
      force: false,
      packageName: "tea-board",
      targetDirectory,
    });

    expect(result.packageName).toBe("tea-board");
    expect(await readdir(targetDirectory)).toEqual(
      expect.arrayContaining([
        ".gitignore",
        "README.md",
        "index.html",
        "package.json",
        "src",
        "tsconfig.json",
        "vite.config.ts",
      ]),
    );

    const packageJson = await readFile(
      join(targetDirectory, "package.json"),
      "utf8",
    );
    const readme = await readFile(join(targetDirectory, "README.md"), "utf8");
    const gitignore = await readFile(
      join(targetDirectory, ".gitignore"),
      "utf8",
    );
    const tsconfig = await readFile(
      join(targetDirectory, "tsconfig.json"),
      "utf8",
    );
    const viteConfig = await readFile(
      join(targetDirectory, "vite.config.ts"),
      "utf8",
    );
    const mainSource = await readFile(
      join(targetDirectory, "src/main.tsx"),
      "utf8",
    );
    const appSource = await readFile(
      join(targetDirectory, "src/App.tsx"),
      "utf8",
    );
    const srcEntries = await readdir(join(targetDirectory, "src"));

    expect(packageJson).toContain('"@ochairo/beat": "^1.0.0"');
    expect(packageJson).toContain('"@ochairo/pulse": "^1.0.7"');
    expect(packageJson).toContain('"preview": "vite preview"');
    expect(readme).toContain("Starter app scaffolded with `create-beat`.");
    expect(gitignore).toContain("node_modules/");
    expect(gitignore).toContain("dist/");
    expect(gitignore).toContain("coverage/");
    expect(tsconfig).toContain('"jsxImportSource": "@ochairo/beat"');
    expect(viteConfig).toContain("createBeatVitePlugin");
    expect(mainSource).toContain("createRoot(target).render(<App />);");
    expect(readme).toContain("a small counter app using explicit Pulse state");
    expect(appSource).toContain("Beat starter");
    expect(appSource).toContain("Counter app");
    expect(appSource).toContain("A small app with room to grow.");
    expect(appSource).toContain('class="panel panel--route"');
    expect(appSource).toContain('class="counter-stepper__button"');
    expect(appSource).not.toContain("top-nav");
    expect(srcEntries).not.toContain("state.ts");
  });

  it("rejects non-empty target directories by default", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "create-beat-"));
    createdDirectories.push(tempRoot);

    await scaffoldBeatApp({
      force: false,
      packageName: "existing-app",
      targetDirectory: tempRoot,
    });

    await expect(
      scaffoldBeatApp({
        force: false,
        packageName: "existing-app",
        targetDirectory: tempRoot,
      }),
    ).rejects.toThrow("Target directory is not empty");
  });

  it("scaffolds the router template when requested", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "create-beat-router-"));
    createdDirectories.push(tempRoot);
    const targetDirectory = join(tempRoot, "route-board");

    const result = await scaffoldBeatApp({
      force: false,
      packageName: "route-board",
      targetDirectory,
      template: "router",
    });

    expect(result.template).toBe("router");

    const readme = await readFile(join(targetDirectory, "README.md"), "utf8");
    const appSource = await readFile(
      join(targetDirectory, "src/App.tsx"),
      "utf8",
    );
    const routerSource = await readFile(
      join(targetDirectory, "src/router.tsx"),
      "utf8",
    );
    const homePageSource = await readFile(
      join(targetDirectory, "src/routes/home-page.tsx"),
      "utf8",
    );
    const resourceSource = await readFile(
      join(targetDirectory, "src/search-panel.tsx"),
      "utf8",
    );

    expect(readme).toContain("create-beat --template router");
    expect(appSource).toContain("<Outlet router={router} />");
    expect(appSource).toContain('to="/about" prefetch="hover"');
    expect(appSource).toContain("Beat starter");
    expect(appSource).toContain("Router app");
    expect(appSource).toContain("A small app with room to grow.");
    expect(appSource).toContain("Counter");
    expect(routerSource).toContain("export const router = createRouter(");
    expect(routerSource).toContain('path: "/about"');
    expect(routerSource).toContain('title: "About Beat"');
    expect(routerSource).toContain(
      "direct rendering, explicit state, and predictable routing",
    );
    expect(routerSource).not.toContain("<For each={match.data?.notes ?? []}>");
    expect(homePageSource).toContain('<p class="eyebrow">Counter</p>');
    expect(homePageSource).toContain("<h2>Counter</h2>");
    expect(homePageSource).toContain(
      'class="counter-stepper__button" onClick={() => counter.set(counter.get() - 1)}',
    );
    expect(homePageSource).toContain(
      'class="counter-stepper__value">{counter}</strong>',
    );
    expect(homePageSource).toContain(
      'class="counter-stepper__button" onClick={() => counter.set(counter.get() + 1)}',
    );
    expect(resourceSource).toContain("createResource({");
    expect(resourceSource).toContain(
      '<Show when={resource.state.data} fallback={<p class="panel-copy">Loading resource data.</p>}>',
    );
    expect(resourceSource).toContain("Search demo");
    expect(resourceSource).toContain("{data.items.map((item) => (");
  });

  it("uses local file dependencies only when workspace packages are available", async () => {
    const workspaceRoot = resolve(process.cwd(), "..");
    const tempRoot = await mkdtemp(join(workspaceRoot, "create-beat-local-"));
    createdDirectories.push(tempRoot);
    const targetDirectory = join(tempRoot, "local-board");

    await scaffoldBeatApp({
      force: false,
      packageName: "local-board",
      targetDirectory,
    });

    const packageJson = await readFile(
      join(targetDirectory, "package.json"),
      "utf8",
    );
    const expectedBeatPath = relative(
      targetDirectory,
      resolve(workspaceRoot, "beat"),
    )
      .split("\\")
      .join("/");
    const expectedPulsePath = relative(
      targetDirectory,
      resolve(workspaceRoot, "pulse"),
    )
      .split("\\")
      .join("/");
    const hasLocalWorkspacePackages =
      existsSync(resolve(workspaceRoot, "beat")) &&
      existsSync(resolve(workspaceRoot, "pulse"));

    if (hasLocalWorkspacePackages) {
      expect(packageJson).toContain(
        `"@ochairo/beat": "file:${expectedBeatPath}"`,
      );
      expect(packageJson).toContain(
        `"@ochairo/pulse": "file:${expectedPulsePath}"`,
      );
      return;
    }

    expect(packageJson).toContain('"@ochairo/beat": "^1.0.0"');
    expect(packageJson).toContain('"@ochairo/pulse": "^1.0.7"');
  });
});
