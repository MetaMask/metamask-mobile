#!/usr/bin/env node
/**
 * App Repack Script using @expo/repack-app
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Logger utility
 */
const logger = {
  info: (msg) => console.log(`📦 ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
};

// Repack only runs for E2E-style builds; we use this to safely stub
// `expo-updates` manifest generation (see `makeCustomSpawnAsync`).
const IS_E2E_REPACK =
  process.env.IS_TEST === 'true' ||
  process.env.E2E === 'true' ||
  process.env.METAMASK_ENVIRONMENT === 'e2e';

/**
 * Implements the `SpawnProcessAsync` contract expected by `@expo/repack-app`
 * using Node's `child_process.spawn`. Resolves with `{ pid, output, stdout,
 * stderr, status, signal }` and attaches `.child` to the returned promise.
 *
 * Kept dependency-free so repack keeps working even if `@expo/spawn-async`
 * is pruned.
 */
function runSpawnAsync(command, args, options = {}) {
  let child;
  const promise = new Promise((resolve, reject) => {
    child = spawn(command, args, { stdio: 'pipe', ...options });
    let stdout = '';
    let stderr = '';
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        if (options.stdio === 'inherit') process.stdout.write(chunk);
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        if (options.stdio === 'inherit') process.stderr.write(chunk);
      });
    }
    child.once('error', (err) => {
      Object.assign(err, {
        pid: child.pid,
        output: [stdout, stderr],
        stdout,
        stderr,
        status: null,
        signal: null,
      });
      reject(err);
    });
    child.once('close', (code, signal) => {
      const result = {
        pid: child.pid,
        output: [stdout, stderr],
        stdout,
        stderr,
        status: code,
        signal,
      };
      if (code !== 0) {
        const err = new Error(
          `${command} ${args.join(' ')} exited with code ${code}${signal ? ` (signal ${signal})` : ''}`
        );
        Object.assign(err, result);
        reject(err);
        return;
      }
      resolve(result);
    });
  });
  promise.child = child;
  return promise;
}

/**
 * Resolves a fake `SpawnProcessResult` synchronously, keeping the same shape
 * `@expo/repack-app` expects.
 */
function fakeSpawnResult() {
  const promise = Promise.resolve({
    pid: 0,
    output: ['', ''],
    stdout: '',
    stderr: '',
    status: 0,
    signal: null,
  });
  promise.child = {}; // Duck-typed; @expo/repack-app only awaits the result.
  return promise;
}

/**
 * Creates a `spawnAsync` function tailored to the current repack context.
 *
 * Two optimizations relative to `@expo/repack-app`'s default spawn:
 *
 * 1. Strip `--reset-cache` from `expo export:embed` so Metro's transform
 *    cache persists across invocations (shared with CI `actions/cache`).
 *    Without this, every repack pays a ~2-3m cold-cache tax.
 *
 * 2. Stub `expo-updates/utils/build/createUpdatesResources.js` for E2E
 *    builds. `@expo/repack-app` always generates `app.manifest` when
 *    `expo-updates` is a dependency — even though E2E builds set
 *    `EXUpdatesEnabled=false` at runtime, so the manifest is never
 *    consulted. Skipping this second Metro bundle saves ~2m per repack.
 *    The stub writes an empty JSON manifest so the downstream `copyFile`
 *    call still succeeds.
 *
 * @param {string} workingDirectory - Passed through so the stub can write
 *   `app.manifest` at the expected path.
 */
function makeCustomSpawnAsync(workingDirectory) {
  return function customSpawnAsync(command, args, options = {}) {
    // 1) Drop --reset-cache from `npx expo export:embed` invocations so
    //    Metro reuses a persisted transform cache.
    if (
      command === 'npx' &&
      Array.isArray(args) &&
      args[0] === 'expo' &&
      args[1] === 'export:embed' &&
      args.includes('--reset-cache')
    ) {
      args = args.filter((a) => a !== '--reset-cache');
    }

    // 2) Skip `createUpdatesResources.js` for E2E repacks — `expo-updates`
    //    is disabled at runtime (see `app.config.js`), so the manifest is
    //    unused. We still write a stub so the library's `copyFile(manifest)`
    //    step below doesn't ENOENT.
    if (
      IS_E2E_REPACK &&
      typeof command === 'string' &&
      command.endsWith('createUpdatesResources.js')
    ) {
      const manifestPath = path.join(workingDirectory, 'app.manifest');
      try {
        fs.mkdirSync(workingDirectory, { recursive: true });
        fs.writeFileSync(
          manifestPath,
          JSON.stringify({ id: 'e2e-stub', assets: [], launchAsset: {} })
        );
        logger.info(
          'Skipped expo-updates manifest generation (E2E build; updates disabled at runtime)'
        );
      } catch (err) {
        logger.warn(
          `Could not write stub app.manifest at ${manifestPath}: ${err.message}. Falling back to real generation.`
        );
        return runSpawnAsync(command, args, options);
      }
      return fakeSpawnResult();
    }

    return runSpawnAsync(command, args, options);
  };
}

function getKeystoreConfig() {
  const isCI = !!process.env.CI;
  const keystorePath = process.env.ANDROID_KEYSTORE_PATH;
  const keystorePassword = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD;
  const keyAlias = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS;
  const keyPassword = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD;

  if (isCI && (!keystorePath || !keystorePassword || !keyAlias || !keyPassword)) {
    logger.error(
      'Missing required Android keystore environment variables in CI. ' +
      'Please check that setup-e2e-env action has configure-keystores: true'
    );
    process.exit(1);
  }

  // apksigner requires 'pass:' prefix for passwords (especially those with special characters)
  const config = {
    keyStorePath: keystorePath || 'android/app/debug.keystore',
    keyStorePassword: keystorePassword ? `pass:${keystorePassword}` : 'pass:android',
    keyAlias: keyAlias || 'androiddebugkey',
    keyPassword: keyPassword ? `pass:${keyPassword}` : 'pass:android',
  };

  logger.info(`Using keystore: ${config.keyStorePath}`);
  logger.info(`Using key alias: ${config.keyAlias}`);
  return config;
}

/**
 * Repack Android APK
 * Currently supports 'flask' and 'main' build types
 */
async function repackAndroid() {
  const startTime = Date.now();
  const sourceApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
  const repackedApk = 'android/app/build/outputs/apk/prod/release/app-prod-release-repack.apk';
  const finalApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
  const sourcemapPath = 'sourcemaps/android/index.android.bundle.map';
  const workingDir = 'android/app/build/repack-working-main';

  try {
    logger.info('🚀 Starting Android E2E APK repack process...');
    logger.info(`Source APK: ${sourceApk}`);

    // Verify source APK exists
    if (!fs.existsSync(sourceApk)) {
      throw new Error(`APK not found: ${sourceApk}`);
    }

    // Ensure directories exist
    fs.mkdirSync(path.dirname(sourcemapPath), { recursive: true });
    fs.mkdirSync(workingDir, { recursive: true });
    fs.mkdirSync(path.dirname(repackedApk), { recursive: true });
    fs.mkdirSync(path.dirname(finalApk), { recursive: true });

    // Dynamic import for ES module compatibility
    const { repackAppAndroidAsync } = await import('@expo/repack-app');
    const keystoreConfig = getKeystoreConfig();

    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: sourceApk,
      outputPath: repackedApk,
      workingDirectory: workingDir,
      verbose: true,
      androidSigningOptions: keystoreConfig,
      exportEmbedOptions: {
        sourcemapOutput: sourcemapPath,
      },
      env: process.env,
      spawnAsync: makeCustomSpawnAsync(workingDir),
    });

    // Copy to final location
    fs.copyFileSync(repackedApk, finalApk);
    if (repackedApk !== finalApk) {
      try { fs.unlinkSync(repackedApk); } catch (e) {
        // Ignore errors when cleaning up intermediate file
      }
    }
    fs.rmSync(workingDir, { recursive: true, force: true });

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 Android APK repack completed in ${duration}s`);

    if (fs.existsSync(sourcemapPath)) {
      logger.success(`Sourcemap: ${sourcemapPath}`);
    }

  } catch (error) {
    logger.error(`Android repack failed: ${error.message}`);
    throw error;
  }
}

/**
 * Generate Expo.plist if it doesn't exist
 */
function generateExpoPlistIfNeeded(appPath) {
  const expoPlistPath = path.join(appPath, 'Expo.plist');

  if (fs.existsSync(expoPlistPath)) {
    logger.info('Expo.plist already exists, skipping generation');
    return;
  }

  logger.warn('Expo.plist not found, generating it...');

  const appConfig = require(path.join(process.cwd(), 'app.config.js'));
  const packageJson = require(path.join(process.cwd(), 'package.json'));

  const manifestBody = JSON.stringify({
    name: appConfig.name || 'MetaMask',
    slug: 'metamask-mobile',
    version: packageJson.version || '1.0.0',
    ios: appConfig.ios || {},
    android: appConfig.android || {},
  });

  const plistXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>EXUpdatesCheckOnLaunch</key>
  <string>NEVER</string>
  <key>EXUpdatesEnabled</key>
  <false/>
  <key>EXUpdatesLaunchWaitMs</key>
  <integer>0</integer>
  <key>Fabric</key>
  <false/>
  <key>manifestBody</key>
  <string>${manifestBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</string>
</dict>
</plist>`;

  fs.writeFileSync(expoPlistPath, plistXml, 'utf8');
  logger.success(`Generated Expo.plist at: ${expoPlistPath}`);
}

/**
 * Repack iOS App
 */
async function repackIos() {
  const startTime = Date.now();
  const sourceApp = 'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app';
  const repackedApp = 'ios/build/Build/Products/Release-iphonesimulator/MetaMask-repack.app';
  const finalApp = 'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app';
  const sourcemapPath = 'sourcemaps/ios/index.js.map';
  const workingDir = 'ios/build/repack-working-main';

  try {
    logger.info('🚀 Starting iOS E2E App repack process...');
    logger.info(`Source App: ${sourceApp}`);

    // Verify source app exists and has a bundle executable
    if (!fs.existsSync(sourceApp)) {
      throw new Error(`App not found: ${sourceApp}`);
    }
    const sourceInfoPlist = path.join(sourceApp, 'Info.plist');
    if (!fs.existsSync(sourceInfoPlist)) {
      throw new Error(`Source app is missing Info.plist: ${sourceApp}`);
    }

    // Generate Expo.plist if it doesn't exist (fallback for builds that don't auto-generate it)
    generateExpoPlistIfNeeded(sourceApp);

    // Ensure directories exist
    fs.mkdirSync(path.dirname(sourcemapPath), { recursive: true });
    fs.mkdirSync(workingDir, { recursive: true });

    // Dynamic import for ES module compatibility
    const { repackAppIosAsync } = await import('@expo/repack-app');

    // Repack iOS App
    logger.info('⏱️  Repacking iOS app with updated JavaScript...');
    await repackAppIosAsync({
      platform: 'ios',
      projectRoot: process.cwd(),
      sourceAppPath: sourceApp,
      outputPath: repackedApp,
      workingDirectory: workingDir,
      verbose: true,
      exportEmbedOptions: {
        sourcemapOutput: sourcemapPath,
      },
      env: process.env,
      spawnAsync: makeCustomSpawnAsync(workingDir),
    });

    // Verify repacked app exists and contains a bundle executable
    if (!fs.existsSync(repackedApp)) {
      throw new Error(`Repacked app not found: ${repackedApp}`);
    }
    // Verify the bundle executable is present.
    // Info.plist is in binary format after repack, so we derive the executable name
    // from the source app directory name (e.g. MetaMask.app -> MetaMask).
    const sourceAppName = path.basename(sourceApp, '.app');
    const executablePath = path.join(repackedApp, sourceAppName);
    if (!fs.existsSync(executablePath)) {
      throw new Error(
        `Repacked app is missing its bundle executable at "${executablePath}". ` +
        `@expo/repack-app may have dropped the binary (possible symlink handling issue). ` +
        `Aborting to prevent uploading a broken artifact — bust IOS_APP_CACHE_VERSION ` +
        `in build-ios-e2e.yml to force a full rebuild.`
      );
    }
    logger.success(`Bundle executable verified: ${sourceAppName}`);
    // Restore execute permissions (may have been lost if the binary came from a cached artifact)
    fs.chmodSync(executablePath, 0o755);
    logger.success(`Execute permissions set on: ${sourceAppName}`);

    // Remove old app and move repacked app to final location
    fs.rmSync(finalApp, { recursive: true, force: true });
    fs.renameSync(repackedApp, finalApp);
    fs.rmSync(workingDir, { recursive: true, force: true });

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 iOS App repack completed in ${duration}s`);

    if (fs.existsSync(sourcemapPath)) {
      logger.success(`Sourcemap: ${sourcemapPath}`);
    }

  } catch (error) {
    logger.error(`iOS repack failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main entry point
 */
async function main() {
  const platform = (process.env.PLATFORM || '').toLowerCase();

  logger.info(`🔧 Repack Platform: ${platform.toUpperCase()}`);
  logger.info(`📍 Working Directory: ${process.cwd()}`);
  logger.info(`🌍 Environment: ${process.env.CI ? 'CI' : 'Local'}`);

  try {
    if (platform === 'ios') {
      await repackIos();
    } else if (platform === 'android') {
      await repackAndroid();
    } else {
      throw new Error(
        `Invalid or missing PLATFORM environment variable. Expected 'ios' or 'android', got: '${platform}'`
      );
    }
  } catch (error) {
    logger.error(`Repack process failed: ${error.message}`);
    if (error.stack) {
      logger.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the main process
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, repackAndroid, repackIos };
