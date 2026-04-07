import Fastify from "fastify";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMarketRows } from "./market-data.mjs";

const SAMPLE_ROOT = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const APP_DIRECTORIES = {
  "/beat/": join(SAMPLE_ROOT, "beat", "dist"),
  "/react/": join(SAMPLE_ROOT, "react", "dist"),
  "/solid/": join(SAMPLE_ROOT, "solid", "dist"),
};
const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

export function createBackendApp(options = {}) {
  const { serveStatic = false } = options;
  const app = Fastify({ logger: false });

  app.get("/health", async () => ({ ok: true }));

  app.get("/api/market", async (request) => {
    const rowCount = resolveRowCount(request.query?.rows);
    return {
      rows: createMarketRows(rowCount),
    };
  });

  if (serveStatic) {
    app.get("/", async (_request, reply) => {
      reply.redirect("/beat/");
    });

    app.get("/beat", async (_request, reply) => {
      reply.redirect("/beat/");
    });

    app.get("/react", async (_request, reply) => {
      reply.redirect("/react/");
    });

    app.get("/solid", async (_request, reply) => {
      reply.redirect("/solid/");
    });

    app.get("/*", async (request, reply) => {
      const wildcardPath = request.params["*"];
      const requestPath =
        typeof wildcardPath === "string"
          ? `/${wildcardPath}`
          : new URL(request.url, "http://127.0.0.1").pathname;
      const resolved = resolveAppPath(requestPath);
      if (!resolved) {
        reply.code(404).type("text/plain; charset=utf-8").send("Not found");
        return;
      }

      const normalizedPath = normalize(resolved.relativePath).replace(
        /^([.][.][/\\])+/,
        "",
      );
      const filePath = join(resolved.directory, normalizedPath);

      try {
        const file = await readFile(filePath);
        reply
          .code(200)
          .header(
            "Content-Type",
            CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
          )
          .send(file);
      } catch {
        reply.code(404).type("text/plain; charset=utf-8").send("Not found");
      }
    });
  }

  return app;
}

function resolveAppPath(urlPath) {
  for (const [prefix, directory] of Object.entries(APP_DIRECTORIES)) {
    if (urlPath === prefix.slice(0, -1)) {
      return { directory, relativePath: "index.html" };
    }

    if (urlPath.startsWith(prefix)) {
      return {
        directory,
        relativePath: urlPath.slice(prefix.length) || "index.html",
      };
    }
  }

  return undefined;
}

function resolveRowCount(value, defaultCount = 10000, maxCount = 50000) {
  const requested = Number(value);

  if (!Number.isFinite(requested) || requested <= 0) {
    return defaultCount;
  }

  return Math.min(Math.floor(requested), maxCount);
}
