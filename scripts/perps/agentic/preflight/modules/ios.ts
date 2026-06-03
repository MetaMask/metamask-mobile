// iOS simulator + app build/install + shared-cache reuse. Build cache + lock
// come from cache.ts; pod staleness from deps.ts.

import { execFileSync, spawn } from 'child_process';
import { appendFileSync, existsSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BuildCache, type CacheLock, reportDrift } from './cache';
import { podsCleanStale, podsSaveMarker } from './deps';
import { restoreMainNoise } from './git';
import { initStageLog, type Logger } from './log';
import { killTree, metroAlive } from './proc';
import type { Ctx } from './types';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const now = (): number => Math.floor(Date.now() / 1000);

function simBooted(label: string): boolean {
  try {
    const out = execFileSync('xcrun', ['simctl', 'list', 'devices'], { encoding: 'utf8' });
    return out.split('\n').some((l) => l.includes(label) && l.includes('Booted'));
  } catch {
    return false;
  }
}

async function ensureSimulator(ctx: Ctx, logger: Logger): Promise<void> {
  if (!ctx.simLabel) {
    logger.fail('Neither IOS_SIMULATOR nor SIM_UDID is set in .js.env — add one to identify your simulator');
  }
  logger.step('Checking simulator', `Looking for ${ctx.simLabel}`);
  if (simBooted(ctx.simLabel)) {
    logger.ok(`Simulator already booted: ${ctx.simLabel}`);
    return;
  }
  if (ctx.checkOnly) logger.fail(`Simulator ${ctx.simLabel} is not booted`);
  logger.plain(`  Booting ${ctx.simLabel}...`);
  spawn('open', ['-a', 'Simulator'], { stdio: 'ignore', detached: true }).unref();
  try {
    execFileSync('xcrun', ['simctl', 'boot', ctx.simTarget], { stdio: 'ignore' });
  } catch {
    // already booting / booted
  }
  for (let i = 0; i < 60; i += 1) {
    if (simBooted(ctx.simLabel)) {
      logger.ok(`Simulator booted: ${ctx.simLabel}`);
      return;
    }
    await sleep(1000);
  }
  logger.fail(`Failed to boot simulator ${ctx.simLabel} within 60s`);
}

function appInstalled(ctx: Ctx): boolean {
  try {
    const out = execFileSync('xcrun', ['simctl', 'listapps', ctx.simTarget], { encoding: 'utf8' });
    return out.includes(ctx.bundleId);
  } catch {
    return false;
  }
}

// Run `pod install` (via bundler), retrying once with --repo-update on failure
// in non-clean modes.
async function podInstall(ctx: Ctx, logger: Logger): Promise<void> {
  if (!ctx.doClean && podsCleanStale(ctx.root, logger)) {
    logger.warn('Stale pod state auto-cleaned');
  }
  const cmd = ctx.doClean
    ? 'cd ios && bundle exec pod install --repo-update --ansi'
    : 'cd ios && bundle exec pod install --ansi';
  logger.plain('  Running pod install via bundler...');
  logger.stageLog(ctx.podInstallLog);
  initStageLog(ctx.podInstallLog, `$ (${cmd})`);
  if ((await logger.runWithLiveLog(ctx.podInstallLog, cmd, ctx.root)) === 0) {
    podsSaveMarker(ctx.root);
    logger.ok('pod install complete');
    restoreMainNoise(ctx.root, ['tsconfig.json'], logger);
    return;
  }
  if (ctx.doClean) {
    logger.warn(`pod install had issues — see ${ctx.podInstallLog}`);
    return;
  }
  logger.warn('pod install failed — retrying with --repo-update');
  execFileSync('rm', ['-rf', 'ios/Pods', 'ios/Podfile.lock'], { cwd: ctx.root });
  const retry = 'cd ios && bundle exec pod install --repo-update --ansi';
  if ((await logger.runWithLiveLog(ctx.podInstallLog, retry, ctx.root)) === 0) {
    podsSaveMarker(ctx.root);
    logger.ok('pod install complete (after --repo-update retry)');
    restoreMainNoise(ctx.root, ['tsconfig.json'], logger);
  } else {
    logger.warn(`pod install had issues — see ${ctx.podInstallLog}`);
  }
}

// Drive `expo run:ios` to produce the .app, then tear down its Metro (start-metro
// owns Metro later). Returns the fresh .app path.
async function buildApp(ctx: Ctx, logger: Logger): Promise<string> {
  logger.plain();
  logger.plain('  Building + installing app');
  logger.dim(`expo run:ios --port ${ctx.port} (bundler killed after build, start-metro.sh takes over)`);
  logger.plain();

  let cmd = `yarn expo run:ios --no-install --port ${ctx.port} --configuration Debug --scheme MetaMask`;
  if (ctx.env.IOS_SIMULATOR) cmd += ` --device ${ctx.env.IOS_SIMULATOR}`;

  const buildLog = join(ctx.root, '.agent/ios-expo-build.log');
  writeFileSync(buildLog, '');
  logger.stageLog(buildLog);
  const buildStart = now();

  const child = spawn('bash', ['-c', cmd], { cwd: ctx.root, stdio: ['ignore', 'pipe', 'pipe'] });
  const onData = (b: Buffer): void => appendFileSync(buildLog, b);
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  let exited = false;
  child.on('close', () => {
    exited = true;
  });

  const findFreshApp = (): string => {
    let out = '';
    try {
      out = execFileSync(
        'find',
        [
          join(ctx.env.HOME ?? '', 'Library/Developer/Xcode/DerivedData'),
          '-path', '*/MetaMask-*/Build/Products/Debug-iphonesimulator/MetaMask.app',
          '-maxdepth', '5', '-prune',
        ],
        { encoding: 'utf8' },
      );
    } catch {
      return '';
    }
    for (const cand of out.split('\n').filter(Boolean)) {
      try {
        if (statSync(cand).isDirectory() && statSync(cand).mtimeMs / 1000 >= buildStart) return cand;
      } catch {
        // skip
      }
    }
    return '';
  };

  const log = (): string => execFileSync('cat', [buildLog], { encoding: 'utf8' });
  while (true) {
    if (now() - buildStart >= ctx.iosBuildTimeout) {
      await killTree(child.pid ?? 0);
      logger.plain();
      logger.plain('  Build log tail:');
      logger.tail(buildLog, 30);
      logger.fail(`Build timed out after ${ctx.iosBuildTimeout}s — see ${buildLog}`);
    }
    const text = log();
    if (/\*\* BUILD SUCCEEDED \*\*|Build Succeeded/.test(text)) {
      const app = findFreshApp();
      if (app) {
        logger.plain(`  → Build Succeeded (${now() - buildStart}s)`);
        await killTree(child.pid ?? 0);
        return app;
      }
    }
    if (/CommandError:|BUILD FAILED/.test(text)) {
      await killTree(child.pid ?? 0);
      logger.plain();
      logger.plain('  Build log tail:');
      logger.tail(buildLog, 30);
      logger.fail(`Build failed — see ${buildLog}`);
    }
    if (exited) {
      logger.plain();
      logger.plain('  expo run:ios exited without producing a fresh .app');
      logger.tail(buildLog, 30);
      logger.fail(`Build failed — see ${buildLog}`);
    }
    await sleep(2000);
  }
}

// Wait for expo's Metro to release $PORT after teardown, unless a healthy reused
// Metro is intentionally holding it.
async function waitPortReleased(ctx: Ctx, logger: Logger): Promise<void> {
  const held = (): boolean => {
    try {
      execFileSync('lsof', ['-iTCP:' + ctx.port, '-sTCP:LISTEN'], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };
  for (let i = 0; i < 20; i += 1) {
    if (!held()) return;
    if (metroAlive(ctx.port)) {
      logger.ok(`Port ${ctx.port} held by healthy Metro (reused) — continuing`);
      return;
    }
    await sleep(1000);
  }
  if (held() && !metroAlive(ctx.port)) {
    logger.fail(`Port ${ctx.port} still held after expo teardown — aborting to avoid CDP misrouting`);
  }
}

export async function runIos(ctx: Ctx, logger: Logger): Promise<void> {
  const cache = new BuildCache(ctx.root);
  await ensureSimulator(ctx, logger);

  logger.step('Checking app', `Looking for ${ctx.bundleId} on simulator`);
  let installed = appInstalled(ctx);
  let lock: CacheLock | null = null;
  const useCache = ctx.mode !== 'clean' && ctx.mode !== 'rebuild-native';
  let fp: string | null = null;

  if (useCache) {
    fp = cache.fingerprint();
    if (fp) {
      const installedFp = cache.installedFp('ios');
      if (installed && installedFp === fp && cache.installedTarget('ios') === ctx.simTarget && !ctx.doRebuild) {
        logger.ok(`Cache: installed app matches fingerprint ${fp.slice(0, 12)} on ${ctx.simTarget} — no native action needed`);
        return;
      }
      lock = await cache.acquireLock('ios', fp);
      if (lock) {
        if (cache.hasArtifact('ios', fp)) {
          if (ctx.checkOnly) {
            await lock.release();
            logger.fail(`App not at fingerprint ${fp.slice(0, 12)} — cache hit available, but --check-only forbids install`);
          }
          logger.plain(`  Cache hit: fp=${fp.slice(0, 12)} — installing from shared cache`);
          const art = cache.artifactPath('ios', fp);
          if (tryInstall(ctx, art)) {
            cache.recordInstall('ios', fp, ctx.simTarget);
            installed = true;
            logger.ok(`Installed from cache: ${art}`);
          } else if (ctx.mode === 'fast') {
            await lock.release();
            logger.fail(`Mode 'fast': cached artifact install failed for fp ${fp.slice(0, 12)}`);
          } else {
            installed = false;
            logger.warn('Cache install failed — falling through to native build');
          }
        } else if (ctx.mode === 'fast') {
          await lock.release();
          logger.fail(`Mode 'fast' but no cached build for fp ${fp.slice(0, 12)} and app not installed at this fingerprint`);
        } else {
          logger.plain(`  Cache miss: fp=${fp.slice(0, 12)} — native build required once`);
          reportDrift(cache, logger, 'ios', installedFp);
          installed = false;
        }
      } else if (ctx.mode === 'fast') {
        logger.fail(`Mode 'fast': could not acquire build-cache lock for fp ${fp.slice(0, 12)}`);
      } else {
        logger.warn(`Could not acquire build-cache lock for fp ${fp.slice(0, 12)} — proceeding without lock`);
        installed = false;
      }
    } else if (ctx.mode === 'fast') {
      logger.fail("Mode 'fast': could not compute fingerprint — cannot validate cache availability");
    } else {
      logger.warn('Could not compute fingerprint — falling back to legacy build path');
    }
  }

  if (installed && !ctx.doRebuild) {
    if (lock) await lock.release();
    logger.ok('App already installed');
    return;
  }
  if (ctx.checkOnly) logger.fail('App not installed (run with --rebuild)');

  await podInstall(ctx, logger);
  const app = await buildApp(ctx, logger);
  await waitPortReleased(ctx, logger);

  if (ctx.doClean || ctx.flags.walletSetup) {
    logger.plain('  Wiping app data (uninstall + reinstall)...');
    try {
      execFileSync('xcrun', ['simctl', 'uninstall', ctx.simTarget, ctx.bundleId], { stdio: 'ignore' });
    } catch {
      // not installed
    }
  }
  logger.plain('  Installing app on simulator...');
  if (!tryInstall(ctx, app) || !appInstalled(ctx)) {
    if (lock) await lock.release();
    logger.fail('simctl install succeeded but app not found');
  }
  logger.ok('App built and installed');

  // Recompute fp post-build/pod (pods can change native fingerprint) and store.
  const storeFp = useCache ? cache.fingerprint() : null;
  if (storeFp) {
    if (cache.storeArtifact('ios', storeFp, app)) {
      cache.snapshot('ios', storeFp);
      logger.ok(`Stored build in shared cache: fp=${storeFp.slice(0, 12)}`);
      cache.recordInstall('ios', storeFp, ctx.simTarget);
      cache.prune('ios');
    } else {
      logger.warn('Failed to store build in cache');
    }
  }
  if (lock) await lock.release();
}

function tryInstall(ctx: Ctx, artifact: string): boolean {
  if (!existsSync(artifact)) return false;
  try {
    execFileSync('xcrun', ['simctl', 'install', ctx.simTarget, artifact], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
