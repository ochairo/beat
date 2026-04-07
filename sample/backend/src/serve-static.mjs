import { createBackendApp } from "./server.mjs";

const HOST = "127.0.0.1";
const PORT = 4173;

const app = createBackendApp({ serveStatic: true });

app.listen({ host: HOST, port: PORT }).then(() => {
  process.stdout.write(`Sample server running at http://${HOST}:${PORT}\n`);
});