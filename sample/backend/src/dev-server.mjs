import { createBackendApp } from "./server.mjs";

const HOST = "127.0.0.1";
const PORT = 4169;

const app = createBackendApp();

app.listen({ host: HOST, port: PORT }).then(() => {
  process.stdout.write(`Sample backend running at http://${HOST}:${PORT}\n`);
});
