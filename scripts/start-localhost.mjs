import { createServer } from "node:http";

import next from "next";

const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev: true, hostname: host, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((request, response) => {
  void handle(request, response);
});

server.listen(port, host, () => {
  console.log(`AICron local dev server ready: http://${host}:${port}`);
});
