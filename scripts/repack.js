#!/usr/bin/env node
/**
 * App Repack Script using @expo/repack-app
 */

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

    // Verify source app exists
    if (!fs.existsSync(sourceApp)) {
      throw new Error(`App not found: ${sourceApp}`);
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

    // Verify and move repacked app
    if (!fs.existsSync(repackedApp)) {
      throw new Error(`Repacked app not found: ${repackedApp}`);
    }

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
