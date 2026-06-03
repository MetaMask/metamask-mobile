// Environment + flag parsing + run-context assembly.

import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, join } from 'path';
import type { Ctx, Flags, Mode, Platform } from './types';

// Merge .js.env into a copy of process.env WITHOUT overriding anything the
// caller already set (caller env wins).
export function loadJsEnv(root: string): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  const file = join(root, '.js.env');
  if (!existsSync(file)) return env;
  for (let raw of readFileSync(file, 'utf8').split('\n')) {
    if (/^\s*(#|$)/.test(raw)) continue;
    raw = raw.replace(/^export\s+/, '');
    const eq = raw.indexOf('=');
    if (eq < 0) continue;
    const key = raw.slice(0, eq).replace(/\s/g, '');
    if (!key) continue;
    let val = raw.slice(eq + 1).trim();
    // Strip a single layer of surrounding quotes, matching shell assignment.
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = val;
  }
  return env;
}

export function resolvePath(root: string, p: string): string {
  return isAbsolute(p) ? p : join(root, p);
}

const KNOWN_MODES: Mode[] = ['auto', 'fast', 'rebuild-native', 'clean', 'default'];

export function parseArgs(
  argv: string[],
  env: Record<string, string | undefined>,
): Flags {
  const flags: Flags = {
    forcePlatform: '',
    mode: '' as Mode,
    modeExplicit: false,
    rebuild: false,
    clean: false,
    launch: true,
    checkOnly: false,
    walletSetup: false,
    walletFixture: env.WALLET_FIXTURE ?? '.agent/wallet-fixture.json',
    walletPw: env.MM_WALLET_PASSWORD ?? '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    switch (a) {
      case '--platform':
        flags.forcePlatform = (argv[(i += 1)] ?? '') as Platform | '';
        break;
      case '--mode':
        flags.mode = (argv[(i += 1)] ?? '') as Mode;
        flags.modeExplicit = true;
        break;
      case '--rebuild':
        flags.rebuild = true;
        break;
      case '--clean':
        flags.clean = true;
        flags.rebuild = true;
        break;
      case '--no-launch':
        flags.launch = false;
        break;
      case '--check-only':
        flags.checkOnly = true;
        flags.launch = false;
        break;
      case '--wallet-setup':
        flags.walletSetup = true;
        break;
      case '--wallet-fixture':
        flags.walletFixture = argv[(i += 1)] ?? flags.walletFixture;
        break;
      case '--wallet':
        flags.walletPw = argv[(i += 1)] ?? '';
        break;
      default:
        break; // unknown args ignored, matching the bash `*) shift` arm
    }
  }
  return flags;
}

// Resolve --mode (or legacy flags) into {mode, doClean, doRebuild}. Throws on an
// unknown explicit mode (bash exits 2).
export function resolveMode(flags: Flags): {
  mode: Mode;
  doClean: boolean;
  doRebuild: boolean;
} {
  let mode = flags.mode;
  if (!flags.modeExplicit) {
    if (flags.clean) mode = 'clean';
    else if (flags.rebuild) mode = 'rebuild-native';
    else mode = 'default';
  }
  let doClean = flags.clean;
  let doRebuild = flags.rebuild;
  switch (mode) {
    case 'auto':
    case 'fast':
      doClean = false;
      doRebuild = false;
      break;
    case 'rebuild-native':
      doClean = false;
      doRebuild = true;
      break;
    case 'clean':
      doClean = true;
      doRebuild = true;
      break;
    case 'default':
      break; // keep parsed flag state
    default:
      throw new Error(
        `unknown --mode '${mode}' (expected: ${KNOWN_MODES.join('|')})`,
      );
  }
  return { mode, doClean, doRebuild };
}

export function detectPlatform(
  flags: Flags,
  env: Record<string, string | undefined>,
): Platform {
  if (flags.forcePlatform) return flags.forcePlatform;
  if (env.PLATFORM === 'ios' || env.PLATFORM === 'android') return env.PLATFORM;
  if (env.SIM_UDID || env.IOS_SIMULATOR) return 'ios';
  if (env.ANDROID_DEVICE) return 'android';
  return process.platform === 'darwin' ? 'ios' : 'android';
}

function sanitizeInt(value: string | undefined, fallback: number): number {
  if (!value || /[^0-9]/.test(value)) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
}

// Resolve the first online adb device serial (android only). Empty string when
// none — the android module fails loud later if a device is required.
function resolveAdbTarget(): string {
  try {
    const out = execFileSync('adb', ['devices'], { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const m = line.match(/^(\S+)\t device$/) ?? line.match(/^(\S+)\tdevice$/);
      if (m) return m[1] ?? '';
    }
  } catch {
    // adb missing / no daemon — leave empty.
  }
  return '';
}

export function buildCtx(root: string, argv: string[]): Ctx {
  const env = loadJsEnv(root);
  const flags = parseArgs(argv, env);
  const { mode, doClean, doRebuild } = resolveMode(flags);
  const plat = detectPlatform(flags, env);
  const port = sanitizeInt(env.WATCHER_PORT, 8081);
  const scripts = 'scripts/perps/agentic';
  const logDir = resolvePath(root, env.PREP_LOG_DIR ?? '.agent/preflight-logs');

  const simLabel = env.IOS_SIMULATOR ?? env.SIM_UDID ?? '';
  const simTarget = env.SIM_UDID ?? env.IOS_SIMULATOR ?? 'booted';

  return {
    root,
    scripts,
    plat,
    port,
    flags,
    mode,
    doClean,
    doRebuild,
    doLaunch: flags.launch,
    checkOnly: flags.checkOnly,
    logDir,
    logFile: resolvePath(root, '.agent/metro.log'),
    depsLog: join(logDir, 'deps.log'),
    podInstallLog: join(logDir, 'pod-install.log'),
    cdpLog: join(logDir, 'cdp.log'),
    walletLog: join(logDir, 'wallet-setup.log'),
    cdpWaitTimeout: sanitizeInt(env.CDP_WAIT_TIMEOUT, 300),
    cdpStatusTimeoutMs: sanitizeInt(env.CDP_STATUS_TIMEOUT_MS, 5000),
    cdpDiscoveryRetries: sanitizeInt(env.CDP_DISCOVERY_RETRIES, 1),
    // 0 = no build timeout (default). Overloaded machines build slowly; only
    // enforce a ceiling when IOS_BUILD_TIMEOUT is set explicitly (e.g. farmslot).
    iosBuildTimeout: sanitizeInt(env.IOS_BUILD_TIMEOUT, 0),
    bundleId: 'io.metamask.MetaMask',
    simTarget,
    simLabel,
    packageId: 'io.metamask',
    adbTarget: plat === 'android' ? resolveAdbTarget() : '',
    env,
  };
}

export function modeLine(mode: Mode, checkOnly: boolean): string {
  switch (mode) {
    case 'auto':
      return 'Mode: auto (fingerprint-gated reuse, build only if needed)';
    case 'fast':
      return 'Mode: fast (no build — fail loud if app missing)';
    case 'rebuild-native':
      return 'Mode: rebuild-native (skip yarn setup, force native rebuild)';
    case 'clean':
      return 'Mode: clean (yarn setup → pod --repo-update → build)';
    default:
      return checkOnly
        ? 'Mode: check-only'
        : 'Mode: default (fingerprint-gated reuse; native build on cache miss)';
  }
}
