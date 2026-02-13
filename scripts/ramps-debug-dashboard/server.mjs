import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocketServer } from 'ws';

const PORT = process.env.RAMPS_DEBUG_PORT || 8099;
const __dirname = dirname(fileURLToPath(import.meta.url));

const httpServer = createServer(async (_req, res) => {
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

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'state') {
          lastState = msg;
        }
        for (const browser of browserClients) {
          if (browser.readyState === 1) {
            browser.send(raw.toString());
          }
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      mobileClient = null;
      console.log('[ramps-debug] Mobile app disconnected');
      for (const browser of browserClients) {
        if (browser.readyState === 1) {
          browser.send(JSON.stringify({ type: 'mobile-disconnected' }));
        }
      }
    });
  } else {
    browserClients.add(ws);
    console.log(`[ramps-debug] Browser dashboard connected (${browserClients.size} total)`);

    if (lastState) {
      ws.send(JSON.stringify(lastState));
    }

    if (mobileClient && mobileClient.readyState === 1) {
      ws.send(JSON.stringify({ type: 'mobile-connected' }));
    }

    ws.on('close', () => {
      browserClients.delete(ws);
      console.log(`[ramps-debug] Browser dashboard disconnected (${browserClients.size} remaining)`);
    });
  }
});

httpServer.listen(PORT, () => {
  console.log(`\n  Ramps Debug Dashboard`);
  console.log(`  ---------------------`);
  console.log(`  Dashboard: http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`\n  Waiting for mobile app to connect...\n`);
});
