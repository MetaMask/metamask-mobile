#!/usr/bin/env node
/**
 * App Repack Script using @expo/repack-app
 *
 * Modes:
 *   PLATFORM=ios  node scripts/repack.js               → simulator .app repack (E2E)
 *   PLATFORM=android node scripts/repack.js             → E2E APK repack + re-sign (QA keystore)
 *   PLATFORM=ios  DEVICE_BUILD=true node scripts/repack.js  → device IPA repack + re-stamp + re-codesign
 *   PLATFORM=android DEVICE_BUILD=true node scripts/repack.js → device APK repack + re-stamp + re-sign
 *
 * Device repack env vars (set by the calling CI step):
 *   BUILD_NUMBER                    — new CFBundleVersion / versionCode to stamp
 *   SEMVER                          — new CFBundleShortVersionString (iOS, optional)
 *   IOS_RESIGN_KEYCHAIN             — path to the signing keychain (default: $RUNNER_TEMP/app-signing.keychain-db)
 *   DEVICE_ANDROID_KEYSTORE_PATH    — path to the release keystore file
 *   DEVICE_ANDROID_KEYSTORE_PASSWORD — keystore password (plain text; 'pass:' prefix added internally)
 *   DEVICE_ANDROID_KEY_ALIAS        — signing key alias
 *   DEVICE_ANDROID_KEY_PASSWORD     — signing key password
 */

// Force production NODE_ENV / BABEL_ENV BEFORE requiring anything that may
// touch process.env. @expo/repack-app calls a helper at the start of every
// repack that does `process.env.NODE_ENV = process.env.NODE_ENV || 'development'`
// and `process.env.BABEL_ENV = process.env.BABEL_ENV || NODE_ENV`. That env
// is then inherited by the spawned `npx expo export:embed --dev false` child,
// where `setNodeEnv('production')` is a no-op because both are already set.
// Babel's React JSX transform reads BABEL_ENV/NODE_ENV (not metro's --dev
// flag) to choose between `jsx` (production) and `jsxDEV` (development), so
// without this guard the rebundled JS contains `jsxDEV(...)` calls while
// metro emits `__DEV__ = false`. The dev-only React runtime then references
// helpers that are tree-shaken when `__DEV__` is false, crashing the app at
// the first render with `TypeError: undefined is not a function` inside
// AppContainer. The native build path is immune because RN's community CLI
// hard-assigns NODE_ENV from --dev. Pre-setting here makes both paths
// produce equivalent production bundles.
process.env.NODE_ENV = 'production';
process.env.BABEL_ENV = 'production';

const fs = require('fs');
const os = require('os');
const path = require('path');
// eslint-disable-next-line import-x/no-nodejs-modules
const { execSync } = require('child_process');

/**
 * Logger utility
 */
const logger = {
  info: (msg) => console.log(`📦 ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
};

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
        `Aborting to prevent uploading a broken artifact — add the \`force-builds\` ` +
        `label (or a \`[force-builds]\` token in the commit message) to the PR to ` +
        `bypass cross-run artifact reuse and force a full native rebuild.`
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
 * Returns the keystore config for device (non-E2E) Android builds.
 *
 * Reads from DEVICE_ANDROID_* env vars which the CI step sets by mapping from
 * whatever the `configure-signing` action exported for the target signing config
 * (e.g. BITRISEIO_ANDROID_RC_KEYSTORE_PASSWORD → DEVICE_ANDROID_KEYSTORE_PASSWORD).
 */
function getDeviceKeystoreConfig() {
  const isCI = !!process.env.CI;
  const keystorePath = process.env.DEVICE_ANDROID_KEYSTORE_PATH;
  const keystorePassword = process.env.DEVICE_ANDROID_KEYSTORE_PASSWORD;
  const keyAlias = process.env.DEVICE_ANDROID_KEY_ALIAS;
  const keyPassword = process.env.DEVICE_ANDROID_KEY_PASSWORD;

  if (isCI && (!keystorePath || !keystorePassword || !keyAlias || !keyPassword)) {
    logger.error(
      'Missing required Android device keystore environment variables. ' +
      'Expected: DEVICE_ANDROID_KEYSTORE_PATH, DEVICE_ANDROID_KEYSTORE_PASSWORD, ' +
      'DEVICE_ANDROID_KEY_ALIAS, DEVICE_ANDROID_KEY_PASSWORD.'
    );
    process.exit(1);
  }

  const config = {
    keyStorePath: keystorePath || 'android/app/debug.keystore',
    keyStorePassword: keystorePassword ? `pass:${keystorePassword}` : 'pass:android',
    keyAlias: keyAlias || 'androiddebugkey',
    keyPassword: keyPassword ? `pass:${keyPassword}` : 'pass:android',
  };

  logger.info(`Using device keystore: ${config.keyStorePath}`);
  logger.info(`Using device key alias: ${config.keyAlias}`);
  return config;
}

/**
 * Repack Android APK for a physical-device build (non-E2E).
 *
 * Finds the release APK in the expected Gradle output directory (any .apk that
 * isn't an androidTest APK), replaces its JS bundle via @expo/repack-app, and
 * re-signs it with the device keystore supplied through DEVICE_ANDROID_*
 * environment variables. The output is written to the Gradle canonical APK
 * name (app-{flavor}-release.apk) so that rename-artifacts.js can pick it up.
 */
async function repackAndroidDevice() {
  const startTime = Date.now();
  const buildType = (process.env.METAMASK_BUILD_TYPE || 'main').toLowerCase();
  const flavor = buildType === 'flask' ? 'flask' : 'prod';
  const apkBaseName = `app-${flavor}-release`;
  const apkDirRel = `android/app/build/outputs/apk/${flavor}/release`;
  const apkDirAbs = path.join(process.cwd(), apkDirRel);
  const sourcemapPath = 'sourcemaps/android/index.android.bundle.map';
  const workingDir = path.join(process.cwd(), `android/app/build/repack-device-working`);

  try {
    logger.info('Starting Android device APK repack process...');

    // Find the source APK — the downloaded artifact may be renamed (e.g.,
    // metamask-rc-main-7.43.0-4823.apk), so scan the directory.
    if (!fs.existsSync(apkDirAbs)) {
      throw new Error(`APK directory not found: ${apkDirAbs}`);
    }
    const apkFiles = fs.readdirSync(apkDirAbs)
      .filter((f) => f.endsWith('.apk') && !f.includes('androidTest'));
    if (apkFiles.length === 0) {
      throw new Error(`No release APK found in: ${apkDirAbs}`);
    }
    const sourceApkAbs = path.join(apkDirAbs, apkFiles[0]);
    logger.info(`Source APK: ${sourceApkAbs}`);

    // Output to the canonical name rename-artifacts.js expects.
    const canonicalApk = path.join(apkDirAbs, `${apkBaseName}.apk`);
    const repackedApk = path.join(apkDirAbs, `${apkBaseName}-repack.apk`);

    fs.mkdirSync(path.dirname(sourcemapPath), { recursive: true });
    fs.mkdirSync(workingDir, { recursive: true });

    const { repackAppAndroidAsync } = await import('@expo/repack-app');
    const keystoreConfig = getDeviceKeystoreConfig();

    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: sourceApkAbs,
      outputPath: repackedApk,
      workingDirectory: workingDir,
      verbose: true,
      androidSigningOptions: keystoreConfig,
      exportEmbedOptions: {
        sourcemapOutput: sourcemapPath,
      },
      env: process.env,
    });

    // Write to canonical name (overwrites any prior file at that path).
    fs.copyFileSync(repackedApk, canonicalApk);
    try { fs.unlinkSync(repackedApk); } catch { /* ignore */ }
    // Remove the originally-downloaded renamed APK if it differs from canonical.
    if (sourceApkAbs !== canonicalApk) {
      try { fs.unlinkSync(sourceApkAbs); } catch { /* ignore */ }
    }
    fs.rmSync(workingDir, { recursive: true, force: true });

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`Android device APK repack completed in ${duration}s`);

    if (fs.existsSync(sourcemapPath)) {
      logger.success(`Sourcemap: ${sourcemapPath}`);
    }
  } catch (error) {
    logger.error(`Android device repack failed: ${error.message}`);
    throw error;
  }
}

/**
 * Repack iOS IPA for a physical-device build (non-E2E).
 *
 * Steps:
 *   1. Find the IPA inside ios/build/output/ (the downloaded artifact).
 *   2. Unzip the IPA to a temp working directory.
 *   3. Replace the JS bundle in Payload/<App>.app via @expo/repack-app.
 *   4. Stamp CFBundleVersion (and optionally CFBundleShortVersionString) via
 *      PlistBuddy using BUILD_NUMBER / SEMVER env vars.
 *   5. Extract entitlements from the original code signature.
 *   6. Find the signing identity from the keychain set up by configure-signing.
 *   7. Re-codesign all embedded frameworks, PlugIns, and the .app itself.
 *   8. Re-zip as an IPA in place (overwrites the downloaded artifact).
 *
 * Required env vars: BUILD_NUMBER
 * Optional env vars: SEMVER, IOS_RESIGN_KEYCHAIN
 */
async function repackIosDevice() {
  const startTime = Date.now();

  const buildNumber = process.env.BUILD_NUMBER;
  const semver = process.env.SEMVER;
  if (!buildNumber) {
    throw new Error('BUILD_NUMBER env var is required for iOS device repack.');
  }

  const ipaDir = path.join(process.cwd(), 'ios/build/output');
  const sourcemapPath = 'sourcemaps/ios/index.js.map';
  const workingDir = path.join(os.tmpdir(), `ipa-repack-device-${Date.now()}`);

  try {
    logger.info('Starting iOS device IPA repack process...');

    // 1. Find the IPA (may be a renamed artifact, e.g. metamask-device-rc-*.ipa)
    if (!fs.existsSync(ipaDir)) {
      throw new Error(`IPA directory not found: ${ipaDir}`);
    }
    const ipaFiles = fs.readdirSync(ipaDir).filter((f) => f.endsWith('.ipa'));
    if (ipaFiles.length === 0) {
      throw new Error(`No .ipa file found in: ${ipaDir}`);
    }
    const ipaPath = path.join(ipaDir, ipaFiles[0]);
    logger.info(`Source IPA: ${ipaPath}`);

    fs.rmSync(workingDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(workingDir, 'Payload'), { recursive: true });
    fs.mkdirSync(path.dirname(sourcemapPath), { recursive: true });

    // 2. Unzip IPA
    logger.info('Extracting IPA...');
    execSync(`unzip -q "${ipaPath}" -d "${workingDir}"`, { stdio: 'pipe' });

    const payloadDir = path.join(workingDir, 'Payload');
    const apps = fs.readdirSync(payloadDir).filter((f) => f.endsWith('.app'));
    if (apps.length === 0) {
      throw new Error('No .app bundle found inside IPA Payload/');
    }
    const appName = apps[0];
    const appPath = path.join(payloadDir, appName);
    logger.info(`Found app bundle: ${appName}`);

    // 3. Replace JS bundle via @expo/repack-app
    generateExpoPlistIfNeeded(appPath);
    logger.info('Repacking app with updated JavaScript bundle...');
    const repackedAppPath = path.join(workingDir, appName.replace('.app', '-repack.app'));
    const repackWorkingDir = path.join(workingDir, 'repack-tmp');

    const { repackAppIosAsync } = await import('@expo/repack-app');
    await repackAppIosAsync({
      platform: 'ios',
      projectRoot: process.cwd(),
      sourceAppPath: appPath,
      outputPath: repackedAppPath,
      workingDirectory: repackWorkingDir,
      verbose: true,
      exportEmbedOptions: {
        sourcemapOutput: sourcemapPath,
      },
      env: process.env,
    });

    if (!fs.existsSync(repackedAppPath)) {
      throw new Error(`Repacked app not found: ${repackedAppPath}`);
    }
    const exeName = path.basename(appName, '.app');
    const executablePath = path.join(repackedAppPath, exeName);
    if (!fs.existsSync(executablePath)) {
      throw new Error(
        `Repacked app missing bundle executable at "${executablePath}". ` +
        `@expo/repack-app may have dropped the binary. ` +
        `Add [force-builds] to the commit message to bypass and run a fresh native build.`
      );
    }
    fs.chmodSync(executablePath, 0o755);
    logger.success(`Bundle executable verified: ${exeName}`);

    // Replace original .app with repacked version
    fs.rmSync(appPath, { recursive: true, force: true });
    fs.renameSync(repackedAppPath, appPath);

    // 4. Stamp new build number
    logger.info(`Stamping CFBundleVersion: ${buildNumber}`);
    const infoPlistPath = path.join(appPath, 'Info.plist');
    execSync(
      `/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${buildNumber}" "${infoPlistPath}"`,
      { stdio: 'pipe' },
    );
    if (semver) {
      logger.info(`Stamping CFBundleShortVersionString: ${semver}`);
      execSync(
        `/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${semver}" "${infoPlistPath}"`,
        { stdio: 'pipe' },
      );
    }
    logger.success(`Build number stamped: ${buildNumber}`);

    // 5. Extract entitlements from existing code signature
    const entitlementsPath = path.join(workingDir, 'entitlements.plist');
    logger.info('Extracting entitlements from existing signature...');
    try {
      execSync(
        `codesign -d --entitlements "${entitlementsPath}" "${appPath}" 2>/dev/null`,
        { shell: true, stdio: 'pipe' },
      );
    } catch {
      logger.warn('Could not extract entitlements; re-signing without explicit entitlements file.');
    }

    // 6. Find signing identity from the keychain set up by configure-signing
    const keychainPath =
      process.env.IOS_RESIGN_KEYCHAIN ||
      path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'app-signing.keychain-db');
    let signingIdentity = '';
    try {
      signingIdentity = execSync(
        `security find-identity -v -p codesigning "${keychainPath}" ` +
          `| grep '"' | head -1 | sed -E 's/.*"(.+)".*/\\1/'`,
        { shell: true, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim();
    } catch {
      // Fallback: search all keychains in the search list
      signingIdentity = execSync(
        `security find-identity -v -p codesigning ` +
          `| grep '"' | head -1 | sed -E 's/.*"(.+)".*/\\1/'`,
        { shell: true, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
      ).trim();
    }
    if (!signingIdentity) {
      throw new Error(
        'Could not find a codesigning identity in the keychain. ' +
        'Ensure configure-signing ran successfully before the device repack step.',
      );
    }
    logger.info(`Using signing identity: ${signingIdentity}`);

    // 7. Re-codesign frameworks, extensions, then the app
    logger.info('Re-codesigning embedded frameworks and PlugIns...');
    const frameworksDir = path.join(appPath, 'Frameworks');
    if (fs.existsSync(frameworksDir)) {
      const items = fs.readdirSync(frameworksDir)
        .filter((f) => f.endsWith('.framework') || f.endsWith('.dylib'));
      for (const item of items) {
        execSync(
          `codesign --force --sign "${signingIdentity}" --timestamp=none "${path.join(frameworksDir, item)}"`,
          { stdio: 'pipe' },
        );
      }
      logger.success(`Re-signed ${items.length} framework(s).`);
    }
    const plugInsDir = path.join(appPath, 'PlugIns');
    if (fs.existsSync(plugInsDir)) {
      const plugins = fs.readdirSync(plugInsDir).filter((f) => f.endsWith('.appex'));
      for (const plugin of plugins) {
        execSync(
          `codesign --force --sign "${signingIdentity}" --timestamp=none "${path.join(plugInsDir, plugin)}"`,
          { stdio: 'pipe' },
        );
      }
      logger.success(`Re-signed ${plugins.length} PlugIn(s).`);
    }

    const entitlementsFlag = fs.existsSync(entitlementsPath)
      ? `--entitlements "${entitlementsPath}"`
      : '';
    execSync(
      `codesign --force --sign "${signingIdentity}" ${entitlementsFlag} --timestamp=none "${appPath}"`,
      { stdio: 'pipe' },
    );
    logger.success('Re-codesigned app bundle.');

    // 8. Re-zip as IPA (overwrite the downloaded artifact in-place)
    logger.info('Re-packaging as IPA...');
    fs.unlinkSync(ipaPath);
    execSync(
      `cd "${workingDir}" && zip -qr "${ipaPath}" Payload/`,
      { shell: true, stdio: 'pipe' },
    );
    logger.success(`Repacked IPA: ${ipaPath}`);

    fs.rmSync(workingDir, { recursive: true, force: true });

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`iOS device IPA repack completed in ${duration}s`);

    if (fs.existsSync(sourcemapPath)) {
      logger.success(`Sourcemap: ${sourcemapPath}`);
    }
  } catch (error) {
    logger.error(`iOS device repack failed: ${error.message}`);
    try { fs.rmSync(workingDir, { recursive: true, force: true }); } catch { /* ignore */ }
    throw error;
  }
}

/**
 * Main entry point
 */
async function main() {
  const platform = (process.env.PLATFORM || '').toLowerCase();
  const deviceBuild = process.env.DEVICE_BUILD === 'true';

  logger.info(`Repack Platform: ${platform.toUpperCase()}`);
  logger.info(`Repack Mode: ${deviceBuild ? 'device' : 'e2e/simulator'}`);
  logger.info(`Working Directory: ${process.cwd()}`);
  logger.info(`Environment: ${process.env.CI ? 'CI' : 'Local'}`);

  try {
    if (platform === 'ios') {
      if (deviceBuild) {
        await repackIosDevice();
      } else {
        await repackIos();
      }
    } else if (platform === 'android') {
      if (deviceBuild) {
        await repackAndroidDevice();
      } else {
        await repackAndroid();
      }
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

module.exports = { main, repackAndroid, repackIos, repackAndroidDevice, repackIosDevice, getDeviceKeystoreConfig };
