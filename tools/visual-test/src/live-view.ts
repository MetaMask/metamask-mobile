import express from 'express';
import { readFileSync } from 'fs';
import { Server } from 'http';
import { LIVE_VIEW_PORT } from './config';
import { LiveViewEvent } from './types';

const HTML_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
  <title>MM Visual Test - Live View</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: #1a1a2e; color: #e0e0e0; }
    .header { background: #16213e; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #0f3460; }
    .header h1 { font-size: 16px; font-weight: 600; }
    .status { padding: 4px 12px; border-radius: 12px; font-size: 13px; }
    .status.running { background: #0f3460; color: #4cc9f0; }
    .status.paused { background: #533a2e; color: #f0a500; }
    .main { display: flex; height: calc(100vh - 49px); }
    .screenshot-panel { flex: 1; display: flex; align-items: center; justify-content: center; background: #0d1117; padding: 20px; }
    .screenshot-panel img { max-height: 100%; max-width: 100%; object-fit: contain; border-radius: 8px; }
    .info-panel { width: 400px; border-left: 1px solid #0f3460; display: flex; flex-direction: column; }
    .current-step { padding: 20px; border-bottom: 1px solid #0f3460; }
    .current-step h2 { font-size: 14px; color: #888; margin-bottom: 8px; }
    .observation { font-size: 14px; line-height: 1.5; margin-bottom: 12px; }
    .action-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; background: #0f3460; color: #4cc9f0; }
    .history { flex: 1; overflow-y: auto; padding: 12px 20px; }
    .history h3 { font-size: 13px; color: #666; margin-bottom: 8px; }
    .history-item { padding: 6px 0; border-bottom: 1px solid #1a1a2e; font-size: 13px; display: flex; gap: 8px; }
    .verdict-pass { color: #4caf50; }
    .verdict-warning { color: #ff9800; }
    .verdict-regression { color: #f44336; }
    .footer { background: #16213e; padding: 8px 20px; border-top: 1px solid #0f3460; font-size: 12px; color: #666; display: flex; gap: 20px; }
    .no-screenshot { color: #444; font-size: 18px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MM Visual Test - Live View</h1>
    <span class="status running" id="status">Running</span>
  </div>
  <div class="main">
    <div class="screenshot-panel">
      <img id="screenshot" style="display:none" />
      <span class="no-screenshot" id="placeholder">Waiting for first screenshot...</span>
    </div>
    <div class="info-panel">
      <div class="current-step">
        <h2 id="step-label">Step -</h2>
        <div class="observation" id="observation">-</div>
        <div><span class="action-badge" id="action">-</span></div>
      </div>
      <div class="history">
        <h3>Previous Steps</h3>
        <div id="history-list"></div>
      </div>
    </div>
  </div>
  <div class="footer">
    <span id="model-info">-</span>
    <span id="step-count">0 steps</span>
  </div>
  <script>
    const evtSource = new EventSource('/events');
    evtSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      if (data.type === 'step' || data.type === 'evaluation') {
        document.getElementById('screenshot').src = '/screenshot?t=' + Date.now();
        document.getElementById('screenshot').style.display = 'block';
        document.getElementById('placeholder').style.display = 'none';
        document.getElementById('step-label').textContent = 'Step ' + data.stepNumber;
        document.getElementById('observation').textContent = data.observation;
        document.getElementById('action').textContent = data.action;
        document.getElementById('step-count').textContent = data.stepNumber + ' steps';
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        data.history.forEach(function(h) {
          const div = document.createElement('div');
          div.className = 'history-item';
          const verdict = h.verdict ? '<span class="verdict-' + h.verdict + '">' + (h.verdict === 'pass' ? 'PASS' : h.verdict === 'warning' ? 'WARN' : 'FAIL') + '</span>' : '';
          div.innerHTML = '<span>[' + h.step + ']</span> ' + verdict + ' <span>' + h.summary + '</span>';
          historyList.appendChild(div);
        });
      }
      if (data.type === 'status') {
        const el = document.getElementById('status');
        el.textContent = data.observation;
        el.className = 'status ' + (data.observation === 'Paused' ? 'paused' : 'running');
      }
    };
  </script>
</body>
</html>`;

export class LiveViewServer {
  private app = express();
  private server: Server | null = null;
  private clients: Array<express.Response> = [];
  private latestScreenshotPath: string | null = null;

  constructor(private port: number = LIVE_VIEW_PORT) {
    this.app.get('/', (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(HTML_TEMPLATE);
    });

    this.app.get('/screenshot', (_req, res) => {
      if (this.latestScreenshotPath) {
        try {
          const img = readFileSync(this.latestScreenshotPath);
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'no-cache');
          res.send(img);
        } catch {
          res.status(404).send('No screenshot');
        }
      } else {
        res.status(404).send('No screenshot yet');
      }
    });

    this.app.get('/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      this.clients.push(res);
      req.on('close', () => {
        this.clients = this.clients.filter((c) => c !== res);
      });
    });
  }

  start(): string {
    this.server = this.app.listen(this.port);
    return `http://localhost:${this.port}`;
  }

  stop(): void {
    this.clients.forEach((c) => {
      try {
        c.end();
      } catch {}
    });
    this.clients = [];
    this.server?.close();
    this.server = null;
  }

  sendEvent(event: LiveViewEvent): void {
    if (event.screenshotPath) {
      this.latestScreenshotPath = event.screenshotPath;
    }
    const data = JSON.stringify(event);
    this.clients.forEach((client) => {
      client.write(`data: ${data}\n\n`);
    });
  }
}
