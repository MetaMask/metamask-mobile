// Android device + app build/install + shared-cache reuse.

import { execFileSync, spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BuildCache, type CacheLock, reportDrift } from './cache';
import { initStageLog, type Logger } from './log';
import type { Ctx } from './types';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function adb(ctx: Ctx, args: string[], opts: { encoding: 'utf8' } | { stdio: 'ignore' }) {
  const base = ctx.adbTarget ? ['-s', ctx.adbTarget] : [];
  return execFileSync('adb', [...base, ...args], opts as never);
}

function deviceOnline(ctx: Ctx): boolean {
  if (!ctx.adbTarget) return false;
  try {
    adb(ctx, ['shell', 'echo', 'ok'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resolveAdbTarget(): string {
  try {
    const out = execFileSync('adb', ['devices'], { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      const m = line.match(/^(\S+)\tdevice$/);
      if (m) return m[1] ?? '';
    }
  } catch {
    // adb missing
  }
  return '';
}

async function ensureDevice(ctx: Ctx, logger: Logger): Promise<void> {
  logger.step('Checking device', 'Looking for an Android emulator or device');
  if (deviceOnline(ctx)) {
    logger.ok('Device connected');
  } else {
    if (ctx.checkOnly) logger.fail('No Android device/emulator connected');
    if (!ctx.env.ANDROID_DEVICE) logger.fail('No device connected and ANDROID_DEVICE not set in .js.env');
    logger.plain(`  Launching emulator: ${ctx.env.ANDROID_DEVICE}...`);
    // Launch detached via argv (no shell) so the device name can't be interpreted.
    const emu = spawn('emulator', ['-avd', ctx.env.ANDROID_DEVICE, '-no-snapshot-load', '-no-audio', '-no-window'], {
      cwd: ctx.root,
      stdio: 'ignore',
      detached: true,
    });
    emu.unref();
    for (let i = 0; i < 60; i += 1) {
      ctx.adbTarget = resolveAdbTarget();
      if (ctx.adbTarget) break;
      await sleep(2000);
      if (i === 59) logger.fail('Emulator did not come online after 120s');
    }
    for (let i = 0; i < 30; i += 1) {
      const boot = adb(ctx, ['shell', 'getprop', 'sys.boot_completed'], { encoding: 'utf8' }).toString().trim();
      if (boot === '1') break;
      await sleep(2000);
    }
    logger.ok(`Emulator booted: ${ctx.env.ANDROID_DEVICE}`);
  }
  if (!ctx.checkOnly) {
    try {
      adb(ctx, ['reverse', `tcp:${ctx.port}`, `tcp:${ctx.port}`], { stdio: 'ignore' });
      logger.ok(`adb reverse tcp:${ctx.port} → host`);
    } catch {
      logger.warn('adb reverse failed — device may not reach Metro');
    }
  }
}

function appInstalled(ctx: Ctx): boolean {
  try {
    return adb(ctx, ['shell', 'pm', 'list', 'packages'], { encoding: 'utf8' }).toString().includes(ctx.packageId);
  } catch {
    return false;
  }
}

function adbInstall(ctx: Ctx, apk: string): boolean {
  try {
    adb(ctx, ['install', '-r', apk], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function uninstallApp(ctx: Ctx): void {
  try {
    adb(ctx, ['uninstall', ctx.packageId], { stdio: 'ignore' });
  } catch {
    // not installed
  }
}

function installCachedArtifact(
  ctx: Ctx,
  logger: Logger,
  cache: BuildCache,
  fp: string,
  deviceId: string,
): boolean {
  const art = cache.artifactPath('android', fp);
  if (ctx.flags.walletSetup) {
    logger.plain('  Wiping app data (uninstall + reinstall from cache)...');
    uninstallApp(ctx);
  }
  if (adbInstall(ctx, art)) {
    cache.recordInstall('android', fp, deviceId);
    logger.ok(`Installed from cache: ${art}`);
    return true;
  }
  return false;
}

async function buildApk(ctx: Ctx, logger: Logger): Promise<string> {
  logger.plain();
  logger.plain('  Building + installing app');
  logger.dim('gradle assembleProdDebug (arm64-v8a only for speed)');
  logger.plain();

  // Prebuild assets the Android build expects.
  execFileSync('bash', ['-c', 'yes | cp -rf app/core/InpageBridgeWeb3.js android/app/src/main/assets/. 2>/dev/null || true'], { cwd: ctx.root });
  execFileSync('bash', ['-c', 'yes | cp -rf ./app/fonts/Metamask.ttf ./android/app/src/main/assets/fonts/Metamask.ttf 2>/dev/null || true'], { cwd: ctx.root });
  if (ctx.env.GOOGLE_SERVICES_B64_ANDROID) {
    execFileSync('bash', ['-c', 'echo -n "$GOOGLE_SERVICES_B64_ANDROID" | base64 -d > ./android/app/google-services.json'], { cwd: ctx.root, env: process.env });
  }

  const buildLog = join(ctx.root, '.agent/android-build.log');
  logger.stageLog(buildLog);
  initStageLog(buildLog, '$ gradlew app:assembleProdDebug');
  const cmd = 'cd android && SENTRY_DISABLE_AUTO_UPLOAD=true ./gradlew app:assembleProdDebug -PreactNativeArchitectures=arm64-v8a';
  const code = await logger.runWithLiveLog(buildLog, cmd, ctx.root);

  const text = existsSync(buildLog) ? readFileSync(buildLog, 'utf8') : '';
  if (/BUILD SUCCESSFUL/.test(text)) {
    logger.plain('  → BUILD SUCCESSFUL');
  } else if (code !== 0 || /BUILD FAILED|FAILURE|error:/.test(text)) {
    logger.plain();
    logger.plain('  Build log tail:');
    logger.tail(buildLog, 30);
    logger.fail(`Gradle build failed — see ${buildLog}`);
  }

  const apk = execFileSync('bash', ['-c', 'find android/app/build/outputs/apk -name "*.apk" -path "*/debug/*" 2>/dev/null | head -1'], { cwd: ctx.root, encoding: 'utf8' }).trim();
  if (!apk) logger.fail(`Build did not produce an APK — check ${buildLog}`);
  return join(ctx.root, apk);
}

export async function runAndroid(ctx: Ctx, logger: Logger): Promise<void> {
  const cache = new BuildCache(ctx.root);
  await ensureDevice(ctx, logger);

  logger.step('Checking app', `Looking for ${ctx.packageId} on device`);
  let installed = appInstalled(ctx);
  let lock: CacheLock | null = null;
  const useCache = ctx.mode !== 'clean' && ctx.mode !== 'rebuild-native';
  const deviceId = ctx.adbTarget || 'default';

  // try/finally guarantees the per-fingerprint build lock is released on every
  // exit path. logger.fail throws, so without this a failed build/install would
  // leak the lock and block other worktrees on this fp until the stale timeout.
  try {
    if (useCache) {
      const fp = cache.fingerprint();
      if (fp) {
        const installedFp = cache.installedFp('android');
        if (installed && installedFp === fp && cache.installedTarget('android') === deviceId && !ctx.doRebuild) {
          if (!ctx.flags.walletSetup) {
            logger.ok(`Cache: installed app matches fingerprint ${fp.slice(0, 12)} on ${deviceId} — no native action needed`);
            return;
          }
          if (ctx.checkOnly) {
            logger.fail('Installed app matches fingerprint, but --wallet-setup requires a data wipe and --check-only forbids reinstall');
          }
          if (cache.hasArtifact('android', fp) && installCachedArtifact(ctx, logger, cache, fp, deviceId)) {
            return;
          }
          logger.warn('Installed app matches fingerprint, but wallet setup requires a data wipe and no cached artifact is available — rebuilding');
          installed = false;
        }
        lock = await cache.acquireLock('android', fp);
        if (lock) {
          if (cache.hasArtifact('android', fp)) {
            if (ctx.checkOnly) {
              logger.fail(`App not at fingerprint ${fp.slice(0, 12)} — cache hit available, but --check-only forbids install`);
            }
            logger.plain(`  Cache hit: fp=${fp.slice(0, 12)} — installing from shared cache`);
            if (installCachedArtifact(ctx, logger, cache, fp, deviceId)) {
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
            reportDrift(cache, logger, 'android', installedFp);
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

    if ((ctx.doClean || ctx.flags.walletSetup) && appInstalled(ctx)) {
      logger.plain('  Uninstalling previous app...');
      uninstallApp(ctx);
    }

    const apk = await buildApk(ctx, logger);
    logger.plain(`  Installing ${apk}...`);
    if (!adbInstall(ctx, apk)) logger.fail('APK install failed');
    if (!appInstalled(ctx)) {
      logger.fail('Build completed but app not found on device');
    }
    logger.ok('App built and installed');

    const storeFp = useCache ? cache.fingerprint() : null;
    if (storeFp) {
      // Acquire a lock for the store if we don't already hold one (the lockless
      // build path), so concurrent worktrees can't corrupt the shared cache —
      // matches bash bc_with_lock.
      const ownLock = lock ? null : await cache.acquireLock('android', storeFp);
      try {
        if (cache.storeArtifact('android', storeFp, apk)) {
          cache.snapshot('android', storeFp);
          logger.ok(`Stored build in shared cache: fp=${storeFp.slice(0, 12)}`);
          cache.recordInstall('android', storeFp, deviceId);
          cache.prune('android');
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
