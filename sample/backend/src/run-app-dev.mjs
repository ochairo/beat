import { spawn } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const API_PORT = 4169;
const REQUIRED_NODE_MAJOR = 24;
const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const SAMPLE_ROOT = resolve(SCRIPT_ROOT, "../..");
const BACKEND_ROOT = resolve(SAMPLE_ROOT, "backend");
const VALID_APPS = new Set(["beat", "react", "solid"]);

const appName = process.argv[2] ?? basename(process.cwd());

if (!VALID_APPS.has(appName)) {
  process.stderr.write(
    `Expected one of ${Array.from(VALID_APPS).join(", ")}; received ${appName ?? "nothing"}.\n`,
  );
  process.exit(1);
}

const appRoot = resolve(SAMPLE_ROOT, appName);
const children = [];
let shuttingDown = false;

async function main() {
  assertSupportedNodeVersion();

  const hadExistingBackend = await isBackendResponsive();

  if (!hadExistingBackend) {
    children.push(
      spawnProcess("pnpm", ["dev"], {
        cwd: BACKEND_ROOT,
        name: "backend",
      }),
    );

    await waitForBackend();
  }

  children.push(
    spawnProcess("pnpm", ["dev:client"], {
      cwd: appRoot,
      name: appName,
    }),
  );

  await Promise.race(children.map((entry) => entry.exitPromise));
  shutdown();
}

function assertSupportedNodeVersion() {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "", 10);

  if (major === REQUIRED_NODE_MAJOR) {
    return;
  }

  throw new Error(
    `Beat sample dev requires Node ${REQUIRED_NODE_MAJOR}.x. Current version: ${process.version}. Activate Node 24 in your version manager before running pnpm dev.`,
  );
}

function spawnProcess(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: process.env,
    stdio: "inherit",
  });

  const exitPromise = new Promise((resolvePromise, rejectPromise) => {
    child.once("exit", (code, signal) => {
      if (shuttingDown) {
        resolvePromise(undefined);
        return;
      }

      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      rejectPromise(
        new Error(
          `${options.name} exited with code ${code ?? "unknown"}${signal ? ` (signal ${signal})` : ""}`,
        ),
      );
    });
    child.once("error", rejectPromise);
  });

  return {
    child,
    exitPromise,
  };
}

async function isBackendResponsive() {
  try {
    const response = await fetch(`http://${HOST}:${API_PORT}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForBackend(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendResponsive()) {
      return;
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }

  throw new Error("Timed out waiting for sample backend on 127.0.0.1:4169.");
}

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const entry of children) {
    if (!entry.child.killed) {
      entry.child.kill("SIGTERM");
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown();
  });
}

void main().catch((error) => {
  shutdown();
  process.stderr.write(
    `${error instanceof Error ? error.message : "Failed to start sample app dev server."}\n`,
  );
  process.exit(1);
});
