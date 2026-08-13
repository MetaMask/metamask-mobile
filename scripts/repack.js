#!/usr/bin/env node
/**
 * App Repack Script using @expo/repack-app
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
const path = require('path');

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
  const useRc =
    process.env.METAMASK_ENVIRONMENT === 'rc' ||
    !!process.env.BITRISEIO_ANDROID_RC_KEYSTORE_PASSWORD;

  const keystorePath =
    process.env.ANDROID_KEYSTORE_PATH ||
    (useRc ? 'android/keystores/rc.keystore' : undefined);
  const keystorePassword = useRc
    ? process.env.BITRISEIO_ANDROID_RC_KEYSTORE_PASSWORD
    : process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD;
  const keyAlias = useRc
    ? process.env.BITRISEIO_ANDROID_RC_KEYSTORE_ALIAS
    : process.env.BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS;
  const keyPassword = useRc
    ? process.env.BITRISEIO_ANDROID_RC_KEYSTORE_PRIVATE_KEY_PASSWORD
    : process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD;

  if (isCI && (!keystorePath || !keystorePassword || !keyAlias || !keyPassword)) {
    logger.error(
      'Missing required Android keystore environment variables in CI. ' +
      (useRc
        ? 'Expected BITRISEIO_ANDROID_RC_KEYSTORE_* from configure-signing (RC signer).'
        : 'Please check that setup-e2e-env action has configure-keystores: true')
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
 * Optional iOS codesign options for device IPA repacks.
 * Simulator .app callers omit these env vars and skip signing.
 *
 *   REPACK_IOS_SIGNING_IDENTITY
 *   REPACK_IOS_PROVISIONING_PROFILE
 *   REPACK_IOS_KEYCHAIN_PATH (optional)
 */
function getIosSigningOptions() {
  const signingIdentity = process.env.REPACK_IOS_SIGNING_IDENTITY;
  const provisioningProfile = process.env.REPACK_IOS_PROVISIONING_PROFILE;
  const keychainPath = process.env.REPACK_IOS_KEYCHAIN_PATH;

  if (!signingIdentity && !provisioningProfile && !keychainPath) {
    return undefined;
  }

  if (!signingIdentity || !provisioningProfile) {
    throw new Error(
      'iOS device repack requires both REPACK_IOS_SIGNING_IDENTITY and REPACK_IOS_PROVISIONING_PROFILE'
    );
  }

  const options = { signingIdentity, provisioningProfile };
  if (keychainPath) {
    options.keychainPath = keychainPath;
  }
  logger.info(`Using iOS signing identity: ${signingIdentity}`);
  logger.info(`Using iOS provisioning profile: ${provisioningProfile}`);
  return options;
}

/**
 * Repack Android APK
 * Currently supports 'flask' and 'main' build types.
 *
 * Optional path overrides (used by performance BrowserStack fingerprint reuse):
 *   REPACK_SOURCE_APK, REPACK_OUTPUT_APK, REPACK_WORKING_DIR, REPACK_SOURCEMAP_PATH
 */
async function repackAndroid() {
  const startTime = Date.now();
  const sourceApk =
    process.env.REPACK_SOURCE_APK ||
    'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
  const repackedApk =
    process.env.REPACK_OUTPUT_APK ||
    'android/app/build/outputs/apk/prod/release/app-prod-release-repack.apk';
  const finalApk =
    process.env.REPACK_FINAL_APK ||
    'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
  const sourcemapPath =
    process.env.REPACK_SOURCEMAP_PATH ||
    'sourcemaps/android/index.android.bundle.map';
  const workingDir =
    process.env.REPACK_WORKING_DIR || 'android/app/build/repack-working-main';

  try {
    logger.info('🚀 Starting Android APK repack process...');
    logger.info(`Source APK: ${sourceApk}`);
    logger.info(`Output APK: ${finalApk}`);
    logger.info(`Working dir: ${workingDir}`);

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
 * Repack iOS App or IPA
 *
 * Optional path overrides (used by RC fingerprint reuse for device IPAs):
 *   REPACK_SOURCE_APP, REPACK_OUTPUT_APP, REPACK_FINAL_APP, REPACK_WORKING_DIR,
 *   REPACK_SOURCEMAP_PATH
 *
 * Device IPA signing (omit for simulator .app):
 *   REPACK_IOS_SIGNING_IDENTITY, REPACK_IOS_PROVISIONING_PROFILE,
 *   REPACK_IOS_KEYCHAIN_PATH
 */
async function repackIos() {
  const startTime = Date.now();
  const sourceApp =
    process.env.REPACK_SOURCE_APP ||
    'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app';
  const isIpaSource = sourceApp.toLowerCase().endsWith('.ipa');
  const repackedApp =
    process.env.REPACK_OUTPUT_APP ||
    (isIpaSource
      ? 'ios/build/output/MetaMask-repack.ipa'
      : 'ios/build/Build/Products/Release-iphonesimulator/MetaMask-repack.app');
  const finalApp =
    process.env.REPACK_FINAL_APP ||
    (isIpaSource
      ? 'ios/build/output/MetaMask.ipa'
      : 'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app');
  const sourcemapPath =
    process.env.REPACK_SOURCEMAP_PATH || 'sourcemaps/ios/index.js.map';
  const workingDir =
    process.env.REPACK_WORKING_DIR || 'ios/build/repack-working-main';

  try {
    logger.info('🚀 Starting iOS app repack process...');
    logger.info(`Source App: ${sourceApp}`);
    logger.info(`Output App: ${finalApp}`);
    logger.info(`Working dir: ${workingDir}`);

    if (!fs.existsSync(sourceApp)) {
      throw new Error(`App not found: ${sourceApp}`);
    }

    if (!isIpaSource) {
      const sourceInfoPlist = path.join(sourceApp, 'Info.plist');
      if (!fs.existsSync(sourceInfoPlist)) {
        throw new Error(`Source app is missing Info.plist: ${sourceApp}`);
      }
      // Generate Expo.plist if it doesn't exist (fallback for builds that don't auto-generate it)
      generateExpoPlistIfNeeded(sourceApp);
    }

    // Ensure directories exist
    fs.mkdirSync(path.dirname(sourcemapPath), { recursive: true });
    fs.mkdirSync(workingDir, { recursive: true });
    fs.mkdirSync(path.dirname(repackedApp), { recursive: true });
    fs.mkdirSync(path.dirname(finalApp), { recursive: true });

    const { repackAppIosAsync } = await import('@expo/repack-app');
    const iosSigningOptions = getIosSigningOptions();

    logger.info('⏱️  Repacking iOS app with updated JavaScript...');
    const repackOptions = {
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
    };
    if (iosSigningOptions) {
      repackOptions.iosSigningOptions = iosSigningOptions;
    }
    await repackAppIosAsync(repackOptions);

    if (!fs.existsSync(repackedApp)) {
      throw new Error(`Repacked app not found: ${repackedApp}`);
    }

    if (!isIpaSource) {
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
      fs.chmodSync(executablePath, 0o755);
      logger.success(`Execute permissions set on: ${sourceAppName}`);

      fs.rmSync(finalApp, { recursive: true, force: true });
      fs.renameSync(repackedApp, finalApp);
    } else {
      fs.copyFileSync(repackedApp, finalApp);
      if (repackedApp !== finalApp) {
        try { fs.unlinkSync(repackedApp); } catch (e) {
          // Ignore errors when cleaning up intermediate file
        }
      }
    }
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

module.exports = { main, repackAndroid, repackIos, getKeystoreConfig, getIosSigningOptions };
