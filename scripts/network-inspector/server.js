/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules */
/**
 * Dev-only network dashboard, mounted on Metro's own port.
 *
 *   GET  /__network-inspector          dashboard
 *   GET  /__network-inspector/events   snapshot of every record
 *   GET  /__network-inspector/stream   live patches (server-sent events)
 *   POST /__network-inspector/ingest   batches from app/util/networkInspector
 *   POST /__network-inspector/clear    drop all records
 *
 * Stacks arrive raw from Hermes; they are symbolicated here through Metro's
 * `/symbolicate`, so the device does no extra work. The first ingest with no
 * dashboard open opens the browser (opt out: MM_NETWORK_INSPECTOR_OPEN=0).
 */
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { parseStack, classifyFrame, pickCaller } = require('./stack');

const BASE = '/__network-inspector';
const MAX_RECORDS = 5000;
const MAX_MESSAGES = 500;
const DASHBOARD_FILE = path.join(__dirname, 'dashboard.html');
const ANALYTICS_FILE = path.join(__dirname, 'analytics.js');

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function openInBrowser(url) {
  const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
  execFile(opener, [url], () => undefined);
}

function createNetworkInspector({ projectRoot }) {
  const records = new Map();
  const clients = new Set();
  let hasOpenedBrowser = false;

  function broadcast(patch) {
    const line = `data: ${JSON.stringify(patch)}\n\n`;
    for (const client of clients) client.write(line);
  }

  function evictOldest() {
    while (records.size > MAX_RECORDS) {
      records.delete(records.keys().next().value);
    }
  }

  async function symbolicate(record, host) {
    const parsed = parseStack(record.rawStack);
    delete record.rawStack;
    let resolved = parsed;
    try {
      const response = await fetch(`http://${host}/symbolicate`, {
        method: 'POST',
        body: JSON.stringify({ stack: parsed }),
      });
      resolved = (await response.json()).stack ?? parsed;
    } catch {
      // Metro unreachable or bundle changed: keep the unsymbolicated frames.
    }
    record.frames = resolved
      .filter(Boolean)
      .map((frame) => classifyFrame(frame, projectRoot));
    record.caller = pickCaller(record.frames);
    broadcast({ id: record.id, frames: record.frames, caller: record.caller });
  }

  function apply(event, host) {
    const { id, wsEvent, stack, ...fields } = event;
    if (!id) return;
    let record = records.get(id);
    if (!record) {
      record = { id, messages: [] };
      records.set(id, record);
      evictOldest();
    }
    Object.assign(record, fields);
    if (wsEvent && record.messages.length < MAX_MESSAGES) {
      record.messages.push(wsEvent);
    }
    broadcast({ id, ...fields, wsEvent });
    if (stack) {
      record.rawStack = stack;
      symbolicate(record, host);
    }
  }

  function maybeOpenBrowser(host) {
    const optedOut = process.env.MM_NETWORK_INSPECTOR_OPEN === '0';
    if (optedOut || process.env.CI || hasOpenedBrowser) return;
    if (clients.size > 0) return;
    hasOpenedBrowser = true;
    openInBrowser(`http://${host}${BASE}`);
  }

  function sendJson(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  async function handle(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    const route = `${req.method} ${pathname.replace(/\/$/, '')}`;
    const host = req.headers.host;

    if (route === `GET ${BASE}`) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(DASHBOARD_FILE, 'utf8'));
      return;
    }
    if (route === `GET ${BASE}/analytics.js`) {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
      return;
    }
    if (route === `GET ${BASE}/events`) {
      sendJson(res, 200, [...records.values()]);
      return;
    }
    if (route === `GET ${BASE}/stream`) {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      });
      res.write('retry: 1000\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (route === `POST ${BASE}/ingest`) {
      const { events = [] } = JSON.parse(await readBody(req));
      maybeOpenBrowser(host);
      for (const event of events) apply(event, host);
      res.writeHead(204).end();
      return;
    }
    if (route === `POST ${BASE}/clear`) {
      records.clear();
      broadcast({ clear: true });
      res.writeHead(204).end();
      return;
    }
    sendJson(res, 404, { error: 'not found' });
  }

  return function enhanceMiddleware(metroMiddleware) {
    return (req, res, next) => {
      if (!req.url.startsWith(BASE)) {
        return metroMiddleware(req, res, next);
      }
      handle(req, res).catch((error) =>
        sendJson(res, 500, { error: String(error) }),
      );
    };
  };
}

module.exports = { createNetworkInspector, BASE };
