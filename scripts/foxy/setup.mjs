#!/usr/bin/env node
// Foxy prerequisites. `yarn foxy` runs this before it starts the server, so a fresh checkout only needs:
//   switch branch -> yarn install -> yarn foxy
//
// It is idempotent and quick. It never needs the network except to fetch the core CODEOWNERS file once a week.
//   node scripts/foxy/setup.mjs            check and fix everything
//   node scripts/foxy/setup.mjs --check    report only, change nothing (what agents use to diagnose)
//   node scripts/foxy/setup.mjs --no-skill do not install the agent skill
//
// Exit codes: 0 ready, 2 a prerequisite is missing (the message says what to run), 4 Foxy is already running.

/* global AbortSignal */
import {
  existsSync, mkdirSync, readFileSync, statSync, writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { homedir, networkInterfaces } from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CORE_CODEOWNERS_URL = 'https://raw.githubusercontent.com/MetaMask/core/main/.github/CODEOWNERS';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Sets `export NAME="value"` in the text of a .js.env file. Changes nothing when it is already set. A commented
 * `# export NAME=...` line is switched on in place; otherwise the line is appended. Other variables (such as
 * FOXY_URL or FOXY_BODIES) are never touched.
 */
export function setEnvFlag(text, name, value) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const active = new RegExp(`^(\\s*export\\s+${escaped}=)(["']?)([^"'#\\s]*)\\2(\\s*(#.*)?)$`);
  const commented = new RegExp(`^\\s*#\\s*export\\s+${escaped}=`);
  const lines = text.split(/\r?\n/);
  let found = false;
  let how = 'unchanged';
  const out = lines.map((line) => {
    const m = line.match(active);
    if (!m) return line;
    found = true;
    if (m[3] === value) return line;
    how = 'updated';
    return `${m[1]}"${value}"${m[4]}`;
  });
  if (!found) {
    const at = out.findIndex((line) => commented.test(line));
    if (at >= 0) {
      out[at] = `export ${name}="${value}"`;
      how = 'uncommented';
    } else {
      while (out.length && out[out.length - 1] === '') out.pop();
      out.push('', '# Foxy network dashboard (turned on by `yarn foxy`, see scripts/foxy/README.md)', `export ${name}="${value}"`, '');
      how = 'added';
    }
  }
  return { text: out.join(eol), changed: how !== 'unchanged', how };
}

/** `^24.22.1` against `v24.3.0`: null when the major matches, otherwise a sentence for the user. */
export function nodeProblem(current, range) {
  const want = String(range || '').match(/(\d+)\./);
  if (!want) return null;
  const have = String(current).replace(/^v/, '').split('.')[0];
  return have === want[1] ? null : `Node ${current} is running, this repo expects ${range} (see .nvmrc)`;
}

/** Serials of the Android devices `adb devices` reports as ready (skips offline and unauthorized ones). */
export function parseAdbDevices(output) {
  return String(output).split(/\r?\n/).slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === 'device')
    .map(([serial]) => serial);
}

/** Finds adb in the Android SDK folders, then on PATH. */
export function findAdb({
  env = process.env,
  home = homedir(),
  exists = existsSync,
  onPath = () => { try { execFileSync('adb', ['version'], { stdio: 'ignore', timeout: 3000 }); return true; } catch { return false; } },
} = {}) {
  const roots = [env.ANDROID_HOME, env.ANDROID_SDK_ROOT, join(home, 'Library', 'Android', 'sdk'), join(home, 'Android', 'Sdk')].filter(Boolean);
  for (const root of roots) {
    const candidate = join(root, 'platform-tools', 'adb');
    if (exists(candidate)) return candidate;
  }
  return onPath() ? 'adb' : null;
}

/** First non-loopback IPv4 address, the one a physical iPhone on the same Wi-Fi can reach. */
export function lanAddress(interfaces = networkInterfaces()) {
  for (const list of Object.values(interfaces)) {
    for (const item of list || []) {
      if ((item.family === 'IPv4' || item.family === 4) && !item.internal) return item.address;
    }
  }
  return null;
}

/** Is the Foxy dashboard answering on this port? */
export async function isFoxy(port, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`http://127.0.0.1:${port}/api/status`, { signal: AbortSignal.timeout(1500) });
    const body = await res.json();
    return Array.isArray(body?.sessions);
  } catch {
    return false;
  }
}

/** 'free', 'foxy' (an earlier `yarn foxy` is still running) or 'busy' (something else owns the port). */
export function probePort(port, fetchImpl = fetch) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', async (error) => {
      if (error.code !== 'EADDRINUSE') return resolve('free');
      resolve((await isFoxy(port, fetchImpl)) ? 'foxy' : 'busy');
    });
    probe.once('listening', () => probe.close(() => resolve('free')));
    probe.listen(port);
  });
}

export async function metroRunning(url, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${url}/status`, { signal: AbortSignal.timeout(1500) });
    return (await res.text()).includes('packager-status:running');
  } catch {
    return false;
  }
}

/**
 * Owner chips for `@metamask/*` frames need the core monorepo's CODEOWNERS. Use a sibling `../core` checkout when
 * there is one, otherwise keep a copy of the file in `scripts/foxy/.cache/core` (refreshed weekly).
 */
export async function ensureCoreCodeowners({
  repo = REPO, cacheDir = join(HERE, '.cache', 'core'), fetchImpl = fetch, now = Date.now(), dryRun = false,
} = {}) {
  if (existsSync(join(repo, '..', 'core', '.github', 'CODEOWNERS'))) return { source: 'sibling' };
  const file = join(cacheDir, '.github', 'CODEOWNERS');
  const fresh = existsSync(file) && now - statSync(file).mtimeMs < WEEK_MS;
  if (fresh || dryRun) return { source: existsSync(file) ? 'cache' : 'missing' };
  try {
    const res = await fetchImpl(CORE_CODEOWNERS_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    return { source: 'downloaded' };
  } catch (error) {
    return { source: existsSync(file) ? 'cache' : 'missing', error: String(error.message || error) };
  }
}

const SKILL_TARGETS = ['.claude/skills', '.agents/skills', '.cursor/skills'];

/** Turns the authored skill (Consensys/skills layout) into the file the agents read. */
export function renderSkill(source) {
  const header = '<!-- Generated by scripts/foxy/setup.mjs from scripts/foxy/skill/skill.md. Edit that file; changes here are overwritten. -->';
  const [, front, body] = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) || [];
  if (!front) return `${header}\n\n${source}`;
  const keep = front.split('\n').filter((line) => !/^maturity:/.test(line)).join('\n');
  return `---\n${keep}\n---\n${header}\n${body}`;
}

/**
 * Installs the `foxy` skill for Claude, Codex-style agents and Cursor. Those folders are gitignored, so this
 * costs nothing in the working tree. Only files that differ are written.
 */
export function installSkill({ repo = REPO, source = join(HERE, 'skill', 'skill.md'), dryRun = false } = {}) {
  if (!existsSync(source)) return { written: [], current: [], missing: true };
  const rendered = renderSkill(readFileSync(source, 'utf8'));
  const written = [];
  const current = [];
  for (const dir of SKILL_TARGETS) {
    const file = join(repo, dir, 'foxy', 'SKILL.md');
    if (existsSync(file) && readFileSync(file, 'utf8') === rendered) { current.push(dir); continue; }
    if (!dryRun) {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, rendered);
    }
    written.push(dir);
  }
  return { written, current };
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const check = argv.includes('--check');
  const withSkill = !argv.includes('--no-skill') && env.FOXY_SKIP_SKILL !== '1';
  const port = Number(env.FOXY_PORT || 8098);
  const metro = env.FOXY_METRO || 'http://localhost:8081';
  const ok = (text) => console.log(`  ✓ ${text}`);
  const note = (text) => console.log(`  • ${text}`);
  const warn = (text) => console.log(`  ! ${text}`);
  const fail = (text) => { console.log(`  ✗ ${text}`); return 2; };

  console.log(check ? 'Foxy setup (check only, nothing is changed)' : 'Foxy setup');

  const range = (() => { try { return JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8')).engines?.node; } catch { return null; } })();
  const nodeIssue = nodeProblem(process.version, range);
  if (nodeIssue) warn(`${nodeIssue}. Run \`nvm use\` if anything below misbehaves`); else ok(`Node ${process.version}`);

  try { createRequire(import.meta.url).resolve('ws'); ok('ws installed'); } catch {
    return fail('The `ws` package is missing. Run `yarn install` in the repo root, then try again');
  }

  // .js.env: Foxy is opt-in, so make sure the app is told to send requests.
  const envFile = join(REPO, '.js.env');
  const example = join(REPO, '.js.env.example');
  let envText = existsSync(envFile) ? readFileSync(envFile, 'utf8') : null;
  let restartMetro = false;
  if (envText === null && !existsSync(example)) {
    warn('No .js.env and no .js.env.example to start from. Create .js.env and add: export FOXY="true"');
  } else {
    const created = envText === null;
    const result = setEnvFlag(envText ?? readFileSync(example, 'utf8'), 'FOXY', 'true');
    if (!result.changed && !created) ok('.js.env has FOXY="true"');
    else if (check) warn(`.js.env ${created ? 'does not exist yet' : 'needs FOXY="true"'} (run \`yarn foxy\` to fix)`);
    else {
      writeFileSync(envFile, result.text);
      restartMetro = true;
      ok(created ? '.js.env created from .js.env.example with FOXY="true" (fill in the other values you need)' : `.js.env updated: FOXY="true" (${result.how})`);
    }
    if (!check || !created) envText = result.text;
  }

  const metroUp = await metroRunning(metro);
  if (restartMetro) {
    warn(`Restart Metro so the app picks up FOXY: stop it, then run \`yarn watch:clean\`${metroUp ? ' (it is running now with the old setting)' : ''}`);
  } else if (metroUp) ok(`Metro is running (${metro})`);
  else warn(`Metro is not running at ${metro}. Start it with \`yarn watch:clean\`; until then stacks are not symbolicated to app/ files`);

  const owners = await ensureCoreCodeowners({ dryRun: check });
  if (owners.source === 'sibling') ok('core CODEOWNERS found next to this repo');
  else if (owners.source === 'cache') ok('core CODEOWNERS (cached copy)');
  else if (owners.source === 'downloaded') ok('core CODEOWNERS downloaded for @metamask/* owner chips');
  else warn(`core CODEOWNERS unavailable${owners.error ? ` (${owners.error})` : ''}: @metamask/* frames will show a dashed fox chip instead of a team. Clone MetaMask/core next to this repo or re-run when online`);

  const adb = findAdb();
  if (!adb) note('Android: adb not found (skip this if you test on iOS only)');
  else {
    let devices = [];
    try { devices = parseAdbDevices(execFileSync(adb, ['devices'], { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] })); } catch { /* adb unavailable */ }
    if (!devices.length) note(`Android: no device attached. Plug one in or start an emulator and re-run \`yarn foxy\` (or \`adb reverse tcp:${port} tcp:${port}\`)`);
    else if (check) note(`Android: ${devices.length} device(s) attached (\`yarn foxy\` runs adb reverse for them)`);
    else {
      for (const serial of devices) {
        try {
          execFileSync(adb, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'ignore', timeout: 8000 });
          ok(`Android ${serial}: adb reverse tcp:${port}`);
        } catch { warn(`Android ${serial}: adb reverse failed, run it by hand: adb -s ${serial} reverse tcp:${port} tcp:${port}`); }
      }
    }
  }

  const lan = lanAddress();
  const urlSet = envText !== null && /^\s*export\s+FOXY_URL=/m.test(envText);
  note(`iOS simulator needs nothing more. A physical iPhone needs${urlSet ? ' (already set)' : ''}: export FOXY_URL="ws://${lan || '<your-lan-ip>'}:${port}/app" in .js.env, then restart Metro`);

  if (withSkill) {
    const skill = installSkill({ dryRun: check });
    if (skill.missing) note('Agent skill source not found (scripts/foxy/skill/skill.md), skipped');
    else if (skill.written.length) (check ? note : ok)(`Agent skill ${check ? 'would be installed' : 'installed'} in ${skill.written.join(', ')}`);
    else ok('Agent skill is up to date');
  }

  const state = await probePort(port);
  if (state === 'foxy') {
    ok(`Foxy is already running: http://localhost:${port}`);
    return check ? 0 : 4;
  }
  if (state === 'busy') return fail(`Port ${port} is used by another program. Free it (lsof -ti tcp:${port}) or set FOXY_PORT, and use the same value in .js.env as FOXY_URL`);
  ok(`Port ${port} is free`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => { process.exitCode = code; });
}
