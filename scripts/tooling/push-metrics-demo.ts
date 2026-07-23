/**
 * DEMO: read the local tool-usage CSV and push real metrics to a
 * Prometheus Pushgateway.
 *
 * Standalone reference — not wired into the build. It reads the same log the
 * collection hooks write (see README), aggregates it per tool, and remote-writes
 * the result so you can explore it in Grafana.
 *
 * Run:
 *   cp scripts/tooling/.env.example scripts/tooling/.env   # then fill in creds
 *   yarn tsx scripts/tooling/push-metrics-demo.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// --- 1. Load credentials from scripts/tooling/.env (tiny KEY=VALUE parser) ---
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  throw new Error(
    'No scripts/tooling/.env found — run: cp scripts/tooling/.env.example scripts/tooling/.env',
  );
}
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2].trim();
}

const { PUSHGATEWAY_URL, PUSHGATEWAY_USERNAME, PUSHGATEWAY_PASSWORD } =
  process.env;

if (!PUSHGATEWAY_URL || !PUSHGATEWAY_USERNAME || !PUSHGATEWAY_PASSWORD) {
  throw new Error('Missing PUSHGATEWAY_* vars — see scripts/tooling/.env.example');
}

// --- 2. Read and aggregate the usage CSV ---------------------------------
// Columns: tool_name,tool_type,event_type,agent_vendor,session_id,success,duration_ms,created_at
const logPath = (
  process.env.TOOL_USAGE_COLLECTION_LOG_PATH ||
  path.join(os.homedir(), '.tool-usage-collection', 'metamask-mobile-events.log')
).replace(/^~/, os.homedir());

if (!fs.existsSync(logPath)) {
  throw new Error(`No usage log at ${logPath} — run some tooling first.`);
}

type Stat = {
  invocations: number;
  success: number;
  failure: number;
  durationSum: number; // seconds
  durationCount: number;
};

// One bucket per (tool, tool_type, agent_vendor) label combination.
const stats = new Map<string, Stat>();
const labelsByKey = new Map<string, Record<string, string>>();

const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').slice(1); // drop header
for (const line of lines) {
  if (!line) continue;
  const [toolName, toolType, eventType, agentVendor, , success, durationMs] =
    line.split(',');

  // `yarn:skills:postinstall` -> `skills:postinstall`; `skill:pr-create` -> `pr-create`.
  const tool = toolName.includes(':')
    ? toolName.slice(toolName.indexOf(':') + 1)
    : toolName;
  const labels = {
    tool,
    tool_type: toolType,
    agent_vendor: agentVendor || 'cli',
  };
  const key = `${labels.tool}|${labels.tool_type}|${labels.agent_vendor}`;
  labelsByKey.set(key, labels);

  const s =
    stats.get(key) ??
    { invocations: 0, success: 0, failure: 0, durationSum: 0, durationCount: 0 };

  if (eventType === 'start') s.invocations += 1;
  if (eventType === 'end') {
    if (success === 'true') s.success += 1;
    else if (success === 'false') s.failure += 1;
    if (durationMs) {
      s.durationSum += Number(durationMs) / 1000;
      s.durationCount += 1;
    }
  }
  stats.set(key, s);
}

if (stats.size === 0) {
  console.log('No usage events found — nothing to push.');
  process.exit(0);
}

// --- 3. Render Prometheus text exposition format -------------------------
// Escape label values per the spec: backslash, double-quote, newline.
const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
const lbl = (l: Record<string, string>) =>
  Object.entries(l)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(',');

const PREFIX = 'metamask_devtools';
const series: string[] = [];
const metric = (name: string, type: string, pick: (s: Stat) => number) => {
  series.push(`# TYPE ${PREFIX}_${name} ${type}`);
  for (const [key, s] of stats) {
    series.push(`${PREFIX}_${name}{${lbl(labelsByKey.get(key)!)}} ${pick(s)}`);
  }
};

metric('invocations_total', 'counter', (s) => s.invocations);
metric('success_total', 'counter', (s) => s.success);
metric('failure_total', 'counter', (s) => s.failure);
metric('duration_seconds_sum', 'gauge', (s) => s.durationSum);
metric('duration_seconds_count', 'gauge', (s) => s.durationCount);

const body = series.join('\n') + '\n'; // trailing newline required

// --- 4. POST it. The job/instance path becomes grouping labels on the series ---
async function main() {
  const job = 'metamask-mobile-devtools';
  const instance = os.hostname();
  const url = `${PUSHGATEWAY_URL}/metrics/job/${job}/instance/${instance}`;
  const auth = Buffer.from(
    `${PUSHGATEWAY_USERNAME}:${PUSHGATEWAY_PASSWORD}`,
  ).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'text/plain' },
    body,
  });

  if (!res.ok) {
    throw new Error(`Push failed: ${res.status} ${await res.text()}`);
  }
  console.log(`Pushed ${stats.size} tool series to ${url} (HTTP ${res.status})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
