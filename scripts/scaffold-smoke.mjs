import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { scaffoldBeatApp } from "../create-beat/index.mjs";

function createCleanNpmEnv() {
  const env = { ...process.env };

  delete env.npm_config_verify_deps_before_run;
  delete env.npm_config__jsr_registry;

  return env;
}

async function main() {
  const tempRoot = await mkdtemp(join(tmpdir(), "create-beat-smoke-"));
  const targetDirectory = join(tempRoot, "smoke-router");

  try {
    await scaffoldBeatApp({
      force: false,
      packageName: "smoke-router",
      targetDirectory,
      template: "router",
    });

    execFileSync("pnpm", ["build"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    const packageJsonPath = join(targetDirectory, "package.json");
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));

    packageJson.pnpm ??= {};
    packageJson.pnpm.onlyBuiltDependencies = ["esbuild"];

    const packOutput = execFileSync("npm", ["pack", process.cwd(), "--json"], {
      cwd: tempRoot,
      encoding: "utf8",
      env: createCleanNpmEnv(),
    });
    const [{ filename }] = JSON.parse(packOutput);
    const packedBeatPath = join(tempRoot, filename);

    packageJson.dependencies["@ochairo/beat"] =
      `file:${relative(targetDirectory, packedBeatPath).split("\\").join("/")}`;

    await writeFile(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      "utf8",
    );

    execFileSync("pnpm", ["install"], {
      cwd: targetDirectory,
      stdio: "inherit",
    });
    execFileSync("pnpm", ["exec", "tsc", "--noEmit"], {
      cwd: targetDirectory,
      stdio: "inherit",
    });
  } finally {
    await rm(tempRoot, { force: true, recursive: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
