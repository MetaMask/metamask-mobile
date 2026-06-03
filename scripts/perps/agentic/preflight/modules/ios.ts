// iOS simulator + app build/install + shared-cache reuse. Build cache + lock
// come from cache.ts; pod staleness from deps.ts.

import { execFileSync, spawn } from 'child_process';
import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BuildCache, type CacheLock, reportDrift } from './cache';
import { podsCleanStale, podsSaveMarker } from './deps';
import { restoreMainNoise } from './git';
import { initStageLog, type Logger } from './log';
import { holderCmd, isMetroLikeProcess, killTree, listenHolderPid, metroAlive } from './proc';
import type { Ctx } from './types';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const now = (): number => Math.floor(Date.now() / 1000);

function isSigned(app: string): boolean {
  try {
    execFileSync('codesign', ['--verify', '--no-strict', app], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// `expo run:ios` logs "Build Succeeded" and we grab the .app from DerivedData, but
// xcodebuild's CodeSign phase can still be in flight — installing in that window
// yields an UNSIGNED bundle. Recent simulator runtimes (iOS 26+) refuse to launch
// unsigned apps ("denied by service delegate (SBMainWorkspace)" with no crash
// report). Wait briefly for the build's signature to land, then ad-hoc sign as a
// fallback so the install is always launchable.
async function ensureSigned(app: string, logger: Logger): Promise<void> {
  if (isSigned(app)) return;
  for (let i = 0; i < 30; i += 1) {
    await sleep(1000);
    if (isSigned(app)) return;
  }
  try {
    execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'ignore' });
    logger.warn(`Build was unsigned at install time — ad-hoc signed ${app}`);
  } catch {
    logger.warn(`Could not ad-hoc sign ${app} — simulator launch may fail`);
  }
}

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

function uninstallApp(ctx: Ctx): void {
  try {
    execFileSync('xcrun', ['simctl', 'uninstall', ctx.simTarget, ctx.bundleId], {
      stdio: 'ignore',
    });
  } catch {
    // not installed
  }
}

async function installCachedArtifact(ctx: Ctx, logger: Logger, cache: BuildCache, fp: string): Promise<boolean> {
  const art = cache.artifactPath('ios', fp);
  if (ctx.flags.walletSetup) {
    logger.plain('  Wiping app data (uninstall + reinstall from cache)...');
    uninstallApp(ctx);
  }
  await ensureSigned(art, logger);
  if (tryInstall(ctx, art)) {
    cache.recordInstall('ios', fp, ctx.simTarget);
    logger.ok(`Installed from cache: ${art}`);
    return true;
  }
  return false;
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

  // Pass argv directly (no shell) so IOS_SIMULATOR can't be interpreted.
  const buildArgs = ['expo', 'run:ios', '--no-install', '--port', String(ctx.port), '--configuration', 'Debug', '--scheme', 'MetaMask'];
  if (ctx.env.IOS_SIMULATOR) buildArgs.push('--device', ctx.env.IOS_SIMULATOR);

  const buildLog = join(ctx.root, '.agent/ios-expo-build.log');
  writeFileSync(buildLog, '');
  logger.stageLog(buildLog);
  const buildStart = now();

  const child = spawn('yarn', buildArgs, { cwd: ctx.root, stdio: ['ignore', 'pipe', 'pipe'] });
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

  const log = (): string => readFileSync(buildLog, 'utf8');
  while (true) {
    if (ctx.iosBuildTimeout > 0 && now() - buildStart >= ctx.iosBuildTimeout) {
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
  const pid = listenHolderPid(ctx.port);
  if (pid == null || metroAlive(ctx.port)) return;

  const cmd = holderCmd(pid);
  if (isMetroLikeProcess(cmd)) {
    logger.warn(`Port ${ctx.port} still held by stale Expo/Metro after expo teardown (PID ${pid}) — start-metro will restart it`);
    logger.dim(cmd.slice(0, 100));
    return;
  }
  logger.fail(`Port ${ctx.port} still held after expo teardown by foreign process (PID ${pid}): ${cmd.slice(0, 80)}`);
}

export async function runIos(ctx: Ctx, logger: Logger): Promise<void> {
  const cache = new BuildCache(ctx.root);
  await ensureSimulator(ctx, logger);

  logger.step('Checking app', `Looking for ${ctx.bundleId} on simulator`);
  let installed = appInstalled(ctx);
  let lock: CacheLock | null = null;
  const useCache = ctx.mode !== 'clean' && ctx.mode !== 'rebuild-native';
  let fp: string | null = null;

  // try/finally guarantees the per-fingerprint build lock is released on every
  // exit path. logger.fail throws, so without this a failed build/install would
  // leak the lock and block other worktrees on this fp until the stale timeout.
  try {
    if (useCache) {
      fp = cache.fingerprint();
      if (fp) {
        const installedFp = cache.installedFp('ios');
        if (installed && installedFp === fp && cache.installedTarget('ios') === ctx.simTarget && !ctx.doRebuild) {
          if (!ctx.flags.walletSetup) {
            logger.ok(`Cache: installed app matches fingerprint ${fp.slice(0, 12)} on ${ctx.simTarget} — no native action needed`);
            return;
          }
          if (ctx.checkOnly) {
            logger.fail('Installed app matches fingerprint, but --wallet-setup requires a data wipe and --check-only forbids reinstall');
          }
          if (cache.hasArtifact('ios', fp) && (await installCachedArtifact(ctx, logger, cache, fp))) {
            return;
          }
          logger.warn('Installed app matches fingerprint, but wallet setup requires a data wipe and no cached artifact is available — rebuilding');
          installed = false;
        }
        lock = await cache.acquireLock('ios', fp);
        if (lock) {
          if (cache.hasArtifact('ios', fp)) {
            if (ctx.checkOnly) {
              logger.fail(`App not at fingerprint ${fp.slice(0, 12)} — cache hit available, but --check-only forbids install`);
            }
            logger.plain(`  Cache hit: fp=${fp.slice(0, 12)} — installing from shared cache`);
            if (await installCachedArtifact(ctx, logger, cache, fp)) {
              installed = true;
            } else if (ctx.mode === 'fast') {
              logger.fail(`Mode 'fast': cached artifact install failed for fp ${fp.slice(0, 12)}`);
            } else {
              installed = false;
              logger.warn('Cache install failed — falling through to native build');
            }
          } else if (ctx.mode === 'fast') {
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
      logger.ok('App already installed');
      return;
    }
    if (ctx.checkOnly) logger.fail('App not installed (run with --rebuild)');

    await podInstall(ctx, logger);

    // pod install can materialize native files that change the fingerprint.
    // Mirror the bash flow: release the pre-pod lock, recompute the fingerprint,
    // re-acquire under it, and re-probe the shared cache before a ~20-min build.
    // Re-probe even when the fp is unchanged — another worktree may have stored
    // an artifact for it during the pod-install wait. `fp` (the pre-pod hash) is
    // the source fp; the build is stored under it as an alias below.
    const sourceFp = fp;
    if (useCache && !installed) {
      // Release the pre-pod lock first so a failed re-acquire can't strand a
      // stale mutex on the old fingerprint (matches bash).
      if (lock) {
        await lock.release();
        lock = null;
      }
      const postFp = cache.fingerprint();
      if (postFp) {
        lock = await cache.acquireLock('ios', postFp);
        if (lock) {
          if (cache.hasArtifact('ios', postFp)) {
            logger.plain(`  Cache hit after pod install: fp=${postFp.slice(0, 12)} — installing from shared cache`);
            const art = cache.artifactPath('ios', postFp);
            if ((await installCachedArtifact(ctx, logger, cache, postFp)) && appInstalled(ctx)) {
              // Release the materialized-fp lock before storing the source alias.
              await lock.release();
              lock = null;
              await storeSourceAlias(cache, logger, sourceFp, postFp, art);
              cache.recordInstall('ios', sourceFp && sourceFp !== postFp ? sourceFp : postFp, ctx.simTarget);
              logger.ok(`Installed from cache: ${art}`);
              return;
            }
            if (ctx.mode === 'fast') {
              logger.fail(`Mode 'fast': post-pod cache install failed for fp ${postFp.slice(0, 12)}`);
            }
            logger.warn('Post-pod cache install failed — falling through to native build');
          } else {
            logger.plain(`  Cache miss after pod install: fp=${postFp.slice(0, 12)} — native build required once`);
          }
        } else if (ctx.mode === 'fast') {
          logger.fail(`Mode 'fast': could not acquire build-cache lock for post-pod fp ${postFp.slice(0, 12)}`);
        } else {
          logger.warn(`Could not acquire post-pod build-cache lock for fp ${postFp.slice(0, 12)} — proceeding without lock`);
        }
      } else if (ctx.mode === 'fast') {
        logger.fail("Mode 'fast': could not compute post-pod fingerprint");
      } else {
        logger.warn('Could not compute post-pod fingerprint — proceeding with native build');
      }
    }

    const app = await buildApp(ctx, logger);
    await waitPortReleased(ctx, logger);

    if (ctx.doClean || ctx.flags.walletSetup) {
      logger.plain('  Wiping app data (uninstall + reinstall)...');
      uninstallApp(ctx);
    }
    // Guard the codesign race: never install a .app before its signature lands.
    await ensureSigned(app, logger);
    logger.plain('  Installing app on simulator...');
    if (!tryInstall(ctx, app)) {
      logger.fail(`simctl install failed for ${app}`);
    }
    if (!appInstalled(ctx)) {
      logger.fail('simctl install reported success but the app is not on the simulator');
    }
    logger.ok('App built and installed');

    // Store under the materialized (post-pod) fp, plus a source-fp alias so a
    // worktree that still computes the pre-pod fp also hits the cache. Record the
    // install under the source fp so the next run's pre-pod lookup matches.
    const storeFp = useCache ? cache.fingerprint() : null;
    if (storeFp) {
      // Acquire a lock for the store if we don't already hold one (the lockless
      // build path), so concurrent worktrees can't corrupt the shared cache —
      // matches bash bc_with_lock.
      const ownLock = lock ? null : await cache.acquireLock('ios', storeFp);
      try {
        if (cache.storeArtifact('ios', storeFp, app)) {
          cache.snapshot('ios', storeFp);
          logger.ok(`Stored build in shared cache: fp=${storeFp.slice(0, 12)}`);
          await storeSourceAlias(cache, logger, sourceFp, storeFp, app);
          cache.recordInstall('ios', sourceFp && sourceFp !== storeFp ? sourceFp : storeFp, ctx.simTarget);
          cache.prune('ios');
        } else {
          logger.warn('Failed to store build in cache');
        }
      } finally {
        if (ownLock) await ownLock.release();
      }
    }
  } finally {
    if (lock) await lock.release();
  }
}

// Store the .app under the pre-pod (source) fingerprint too, so a worktree that
// still computes the source fp hits the cache instead of rebuilding. No-op when
// the fp is unchanged, the artifact is gone, or an alias already exists. Uses its
// own lock — the caller must not hold the source-fp lock.
async function storeSourceAlias(
  cache: BuildCache,
  logger: Logger,
  sourceFp: string | null,
  materializedFp: string,
  artifact: string,
): Promise<void> {
  if (!sourceFp || sourceFp === materializedFp) return;
  if (!existsSync(artifact) || cache.hasArtifact('ios', sourceFp)) return;
  const aliasLock = await cache.acquireLock('ios', sourceFp);
  if (!aliasLock) {
    logger.warn(`Could not store source-fingerprint cache alias ${sourceFp.slice(0, 12)} for ${materializedFp.slice(0, 12)}`);
    return;
  }
  try {
    if (cache.storeArtifact('ios', sourceFp, artifact)) {
      logger.ok(`Stored build in shared cache: fp=${sourceFp.slice(0, 12)} (source alias for ${materializedFp.slice(0, 12)})`);
    } else {
      logger.warn(`Could not store source-fingerprint cache alias ${sourceFp.slice(0, 12)} for ${materializedFp.slice(0, 12)}`);
    }
  } finally {
    await aliasLock.release();
  }
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
