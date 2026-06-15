/**
 * DEMO: how to push a metric to a Prometheus Pushgateway.
 *
 * This is a minimal, self-contained example — not wired into the build.
 * It pushes one gauge so you can see a value land in Grafana, then exit.
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

// --- 2. Build the metric in Prometheus text exposition format ---
// `# TYPE` declares the metric kind; the next line is `name{labels} value`.
const body = [
  '# TYPE metamask_devtools_demo_build_seconds gauge',
  'metamask_devtools_demo_build_seconds{step="bundle"} 42',
  '', // trailing newline is required by the exposition format
].join('\n');

// --- 3. POST it. The job/instance path becomes grouping labels on the series ---
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
  console.log(`Pushed metric to ${url} (HTTP ${res.status})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
