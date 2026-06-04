// JS-dependency and setup-artifact staleness detection, the two-tier reconcile
// (cheap install vs full setup), and the clean setup step.

import { accessSync, constants, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import { join, relative } from 'path';
import { initStageLog, type Logger } from './log';
import { restoreMainNoise } from './git';
import type { Ctx, DepsDecision } from './types';

const SETUP_MARKER = '.agent/build-cache/setup-inputs.ts.sha256';
const PODS_MARKER = '.agent/build-cache/ios/pods-inputs.sha256';

function newerThan(a: string, b: string): boolean {
  return statSync(a).mtimeMs > statSync(b).mtimeMs;
}

// node_modules out of sync with package.json/yarn.lock, or the expo bin missing.
export function jsDepsNeedInstall(root: string): boolean {
  const state = join(root, 'node_modules/.yarn-state.yml');
  if (!existsSync(join(root, 'node_modules')) || !existsSync(state)) return true;
  const pkg = join(root, 'package.json');
  const lock = join(root, 'yarn.lock');
  if (existsSync(pkg) && newerThan(pkg, state)) return true;
  if (existsSync(lock) && newerThan(lock, state)) return true;
  return spawnSync('yarn', ['bin', 'expo'], { cwd: root, stdio: 'ignore' }).status !== 0;
}

function walkFiles(absDir: string): string[] {
  if (!existsSync(absDir)) return [];
  return (readdirSync(absDir, { recursive: true }) as string[])
    .map((p) => join(absDir, p))
    .filter((p) => {
      try {
        return statSync(p).isFile();
      } catch {
        return false;
      }
    });
}

// Hash of the sources that drive generated artifacts. Excludes yarn.lock —
// a pure dependency bump is the cheaper install tier's job, not a regen.
function setupInputsHash(root: string): string {
  const h = createHash('sha256');
  const globbed = [
    ...walkFiles(join(root, 'patches')),
    ...walkFiles(join(root, 'scripts/inpage-bridge/src')),
  ].sort();
  for (const f of globbed) {
    h.update(relative(root, f));
    h.update('\0');
    h.update(readFileSync(f));
    h.update('\0');
  }
  for (const f of ['scripts/build-inpage-bridge.sh', 'scripts/setup.mjs']) {
    if (!existsSync(join(root, f))) continue;
    h.update(f);
    h.update('\0');
    h.update(readFileSync(join(root, f)));
    h.update('\0');
  }
  return h.digest('hex');
}

export function setupSaveMarker(root: string): void {
  mkdirSync(join(root, '.agent/build-cache'), { recursive: true });
  writeFileSync(join(root, SETUP_MARKER), setupInputsHash(root));
}

function isExecutable(p: string): boolean {
  try {
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// True when `yarn setup:expo` is needed: a generated artifact is missing, or the
// artifact-driving inputs (patches / inpage-bridge source / setup scripts) drifted
// since the last setup. Deliberately does NOT escalate on a merely stale
// node_modules — that is the cheap install tier's job. A full setup here would
// regenerate the inpage bridge, which is a hashed build-fingerprint input, so it
// would bust the native cache on every package.json/yarn.lock touch. With no
// marker yet on a healthy worktree, adopt current state as the baseline.
export function setupArtifactsNeedRegen(root: string): boolean {
  const missing =
    !existsSync(join(root, 'app/core/InpageBridgeWeb3.js')) ||
    !existsSync(join(root, 'docs/assets/termsOfUse.html')) ||
    !existsSync(join(root, 'app/util/termsOfUse/termsOfUseContent.ts')) ||
    !isExecutable(join(root, 'node_modules/.bin/anvil'));
  if (missing) return true;

  const marker = join(root, SETUP_MARKER);
  const current = setupInputsHash(root);
  if (existsSync(marker)) return readFileSync(marker, 'utf8').trim() !== current;
  setupSaveMarker(root);
  return false;
}

// ── iOS pod staleness ──────────────────────────────────────────────
// yarn.lock + ios/Podfile fully determine the expected pod set.
function podsInputHash(root: string): string {
  const h = createHash('sha256');
  for (const f of ['yarn.lock', 'ios/Podfile']) {
    if (existsSync(join(root, f))) h.update(readFileSync(join(root, f)));
  }
  return h.digest('hex');
}

export function podsAreStale(root: string): boolean {
  if (!existsSync(join(root, 'ios/Podfile.lock'))) return false; // nothing to be stale
  const marker = join(root, PODS_MARKER);
  if (!existsSync(marker)) return true;
  return readFileSync(marker, 'utf8').trim() !== podsInputHash(root);
}

export function podsSaveMarker(root: string): void {
  mkdirSync(join(root, '.agent/build-cache/ios'), { recursive: true });
  writeFileSync(join(root, PODS_MARKER), podsInputHash(root));
}

export function podsCleanStale(root: string, logger: Logger): boolean {
  if (!podsAreStale(root)) return false;
  logger.plain('  Pods inputs changed (yarn.lock / Podfile) — cleaning stale pod state...');
  spawnSync('rm', ['-rf', 'ios/Pods', 'ios/Podfile.lock'], { cwd: root });
  return true;
}

// ── Decide + reconcile ─────────────────────────────────────────────
// Full setup (setup:expo) only when artifacts are missing or their source inputs
// drifted; a merely stale node_modules takes the cheap install tier.
export function decideDeps(ctx: Ctx, logger: Logger): DepsDecision {
  if (ctx.doClean) return { jsDepsStale: false, setupStale: false };
  if (setupArtifactsNeedRegen(ctx.root)) {
    if (ctx.checkOnly) {
      logger.fail(
        'Setup artifacts stale or missing (patches / inpage bridge / termsOfUse / anvil) — run without --check-only to regenerate via yarn setup:expo',
      );
    }
    return { jsDepsStale: false, setupStale: true };
  }
  if (jsDepsNeedInstall(ctx.root)) {
    if (ctx.checkOnly) {
      logger.fail(
        'JS dependencies are stale or missing required bins (run without --check-only to reconcile node_modules)',
      );
    }
    return { jsDepsStale: true, setupStale: false };
  }
  return { jsDepsStale: false, setupStale: false };
}

async function runStep(
  ctx: Ctx,
  logger: Logger,
  title: string,
  detail: string,
  cmd: string,
  failMsg: string,
): Promise<void> {
  logger.step(title, detail);
  logger.stageLog(ctx.depsLog);
  initStageLog(ctx.depsLog, `$ ${cmd}`);
  if ((await logger.runWithLiveLog(ctx.depsLog, cmd, ctx.root)) !== 0) {
    logger.plain();
    logger.plain(`  ${failMsg} — see ${ctx.depsLog}`);
    logger.tail(ctx.depsLog);
    logger.fail(failMsg);
  }
}

export async function reconcile(ctx: Ctx, logger: Logger, d: DepsDecision): Promise<void> {
  if (d.setupStale) {
    await runStep(
      ctx,
      logger,
      'Regenerating setup artifacts',
      'yarn setup:expo (patches / inpage bridge / termsOfUse / anvil drifted or missing — native build skipped)',
      'yarn setup:expo',
      'yarn setup:expo failed',
    );
    setupSaveMarker(ctx.root);
    logger.ok('Setup artifacts regenerated');
    restoreMainNoise(ctx.root, ['tsconfig.json'], logger);
  } else if (d.jsDepsStale) {
    await runStep(
      ctx,
      logger,
      'Reconciling JS dependencies',
      'yarn install --immutable (package/yarn state changed or expo bin missing)',
      'yarn install --immutable',
      'yarn install --immutable failed',
    );
    logger.ok('node_modules reconciled');
  }
}

// The --clean "Installing dependencies" step: wipe build artifacts + stale pods,
// run full `yarn setup`, then record both markers.
export async function runCleanSetup(ctx: Ctx, logger: Logger): Promise<void> {
  if (ctx.plat === 'ios') {
    logger.step('Installing dependencies', 'rm ios/build → yarn setup (install deps + patches + pods)');
    logger.plain('  Cleaning iOS build artifacts...');
    spawnSync('rm', ['-rf', 'ios/build'], { cwd: ctx.root });
    if (!podsCleanStale(ctx.root, logger)) {
      logger.plain('  Pods inputs unchanged — cleaning anyway (--clean mode)...');
      spawnSync('rm', ['-rf', 'ios/Pods', 'ios/Podfile.lock'], { cwd: ctx.root });
    }
  } else {
    logger.step('Installing dependencies', 'clean android build → yarn setup (install deps + patches)');
    logger.plain('  Cleaning Android build artifacts...');
    spawnSync('rm', ['-rf', 'android/app/build'], { cwd: ctx.root });
  }
  logger.stageLog(ctx.depsLog);
  initStageLog(ctx.depsLog, '$ yarn setup');
  if ((await logger.runWithLiveLog(ctx.depsLog, 'yarn setup', ctx.root)) !== 0) {
    logger.plain();
    logger.plain(`  Dependencies failed — see ${ctx.depsLog}`);
    logger.tail(ctx.depsLog);
    logger.fail('yarn setup failed');
  }
  if (ctx.plat === 'ios') podsSaveMarker(ctx.root);
  setupSaveMarker(ctx.root);
  logger.ok('yarn setup complete');
  restoreMainNoise(ctx.root, ['tsconfig.json'], logger);
}
