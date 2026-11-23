#!/usr/bin/env node
// Replays a captured Foxy log (JSONL) into a running Foxy server, as if the app were sending it live.
// Handy for demoing the dashboard or re-analysing an old capture without relaunching the app.
//
//   node scripts/foxy/replay.mjs [logfile] [port]
//
// logfile defaults to logs/foxy.jsonl, port to FOXY_PORT or 8098.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import WebSocket from 'ws';

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(process.argv[2] ?? join(here, 'logs', 'foxy.jsonl'));
const port = process.argv[3] ?? process.env.FOXY_PORT ?? '8098';

const messages = readFileSync(file, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const ws = new WebSocket(`ws://localhost:${port}/app`);
ws.on('error', (e) => {
  console.error(`Could not reach Foxy on port ${port}: ${e.message}`);
  process.exit(1);
});
ws.on('open', async () => {
  for (const m of messages) {
    ws.send(JSON.stringify(m));
    await new Promise((r) => setTimeout(r, 3));
  }
  console.log(`Replayed ${messages.length} messages from ${file} into port ${port}`);
  setTimeout(() => process.exit(0), 500);
});
