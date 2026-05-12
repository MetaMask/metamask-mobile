import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';
import { createSessionLogger } from './logger.mjs';

const PORT = process.env.RAMPS_DEBUG_PORT || 8099;
const __dirname = dirname(fileURLToPath(import.meta.url));

/** Default path Cursor/agents can read to mirror the dashboard (JSON Lines). */
const DEFAULT_LOG_FILE = join(__dirname, 'logs', 'ramps-debug.jsonl');
const LOG_FILE = process.env.RAMPS_DEBUG_LOG_FILE || DEFAULT_LOG_FILE;

const sessionLogger = createSessionLogger(LOG_FILE);

const httpServer = createServer(async (req, res) => {
  try {
    const html = await readFile(join(__dirname, 'dashboard.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch {
    res.writeHead(500);
    res.end('Failed to load dashboard');
  }
});

const wss = new WebSocketServer({ server: httpServer });

const browserClients = new Set();
let mobileClient = null;
let lastState = null;

wss.on('connection', (ws, req) => {
  const isMobile = req.headers['x-ramps-debug-source'] === 'mobile';

  if (isMobile) {
    mobileClient = ws;
    console.log('[ramps-debug] Mobile app connected');
    void sessionLogger.log({ type: 'mobile-connected' });

    ws.on('message', (raw) => {
      const rawStr = raw.toString();
      try {
        const msg = JSON.parse(rawStr);
        if (msg.type === 'state') {
          lastState = msg;
        }
        void sessionLogger.log({
          type: 'mobile-message',
          payload: msg,
        });
        for (const browser of browserClients) {
          if (browser.readyState === 1) {
            browser.send(rawStr);
          }
        }
      } catch {
        void sessionLogger.log({
          type: 'mobile-message-parse-error',
          rawLength: rawStr.length,
          rawPreview: rawStr.slice(0, 500),
        });
      }
    });

    ws.on('close', () => {
      if (mobileClient !== ws) {
        return;
      }
      mobileClient = null;
      console.log('[ramps-debug] Mobile app disconnected');
      void sessionLogger.log({ type: 'mobile-disconnected' });
      for (const browser of browserClients) {
        if (browser.readyState === 1) {
          browser.send(JSON.stringify({ type: 'mobile-disconnected' }));
        }
      }
    });
  } else {
    browserClients.add(ws);
    console.log(
      `[ramps-debug] Browser dashboard connected (${browserClients.size} total)`,
    );

    if (lastState) {
      ws.send(JSON.stringify(lastState));
    }

    if (mobileClient && mobileClient.readyState === 1) {
      ws.send(JSON.stringify({ type: 'mobile-connected' }));
    }

    ws.on('close', () => {
      browserClients.delete(ws);
      console.log(
        `[ramps-debug] Browser dashboard disconnected (${browserClients.size} remaining)`,
      );
    });
  }
});

httpServer.listen(PORT, async () => {
  await sessionLogger.ensureDir();
  await sessionLogger.log({
    type: 'session-start',
    pid: process.pid,
    port: Number(PORT),
    logFile: LOG_FILE,
    note: 'Same payloads as the browser dashboard (one JSON object per line).',
  });
  console.log(`\n  Ramps Debug Dashboard`);
  console.log(`  ---------------------`);
  console.log(`  Dashboard: http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`  Session log (JSONL): ${LOG_FILE}`);
  console.log(`  Set RAMPS_DEBUG_LOG_FILE to override the log path.\n`);
  console.log(`  Waiting for mobile app to connect...\n`);
});
