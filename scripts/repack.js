#!/usr/bin/env node
/**
 * App Repack Script using @expo/repack-app
 */

const fs = require('fs');
const path = require('path');
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

const isFlask = process.env.METAMASK_BUILD_TYPE === 'flask';

/**
 * Get Android keystore configuration
 * Currently supports 'flask' and 'main' build types
 */
function getKeystoreConfig() {
  const isCI = !!process.env.CI;
  const keystorePath = process.env.ANDROID_KEYSTORE_PATH;
  // Allow overriding keystore type (e.g. to use 'main' keys even for 'flask' build type)
  const useFlaskKeystore = process.env.KEYSTORE_TYPE ? process.env.KEYSTORE_TYPE === 'flask' : isFlask;

  const keystorePassword = useFlaskKeystore ? process.env.BITRISEIO_ANDROID_FLASK_UAT_KEYSTORE_PASSWORD : process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD;
  const keyAlias = useFlaskKeystore ? process.env.BITRISEIO_ANDROID_FLASK_UAT_KEYSTORE_ALIAS : process.env.BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS;
  const keyPassword = useFlaskKeystore ? process.env.BITRISEIO_ANDROID_FLASK_UAT_KEYSTORE_PRIVATE_KEY_PASSWORD : process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD;

  // In CI, if env vars are missing, fall back to debug keystore instead of failing
  if (isCI && (!keystorePath || !keystorePassword || !keyAlias || !keyPassword)) {
    logger.warn(
      'Missing Android keystore environment variables in CI. ' +
      'Falling back to debug keystore.'
    );
  }

  const config = {
    keyStorePath: path.resolve(process.cwd(), keystorePath || 'android/app/debug.keystore'),
    keyStorePassword: keystorePassword || 'android',
    keyAlias: keyAlias || 'androiddebugkey',
    keyPassword: keyPassword || 'android',
  };

  logger.info(`Using keystore: ${config.keyStorePath}`);
  logger.info(`Using key alias: ${config.keyAlias}`);
  return config;
}

function findApkSigner() {
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!androidHome) return null;
  
  const buildTools = path.join(androidHome, 'build-tools');
  if (!fs.existsSync(buildTools)) return null;
  
  const versions = fs.readdirSync(buildTools).sort().reverse();
  if (versions.length === 0) return null;
  
  const signerPath = path.join(buildTools, versions[0], 'apksigner');
  // Check for both 'apksigner' (binary) and 'apksigner.bat' (Windows) or just executable existence
  if (fs.existsSync(signerPath)) return signerPath;
  if (fs.existsSync(signerPath + '.bat')) return signerPath + '.bat';
  return null;
}

/**
 * Repack Android APK
 * Currently supports 'flask' and 'main' build types
 */
async function repackAndroid() {
  const startTime = Date.now();
  const sourceApk = process.env.SOURCE_APK || (isFlask ? 'android/app/build/outputs/apk/flask/release/app-flask-release.apk' : 'android/app/build/outputs/apk/prod/release/app-prod-release.apk');
  const repackedApk = isFlask ? 'android/app/build/outputs/apk/flask/release/app-flask-release-repack.apk' : 'android/app/build/outputs/apk/prod/release/app-prod-release-repack.apk';
  const finalApk = isFlask ? 'android/app/build/outputs/apk/flask/release/app-flask-release.apk' : 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
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

    // Dynamic import for ES module compatibility
    const { repackAppAndroidAsync } = await import('@expo/repack-app');

    // Repack APK
    logger.info('⏱️  Repacking APK with updated JavaScript...');
    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: sourceApk,
      outputPath: repackedApk,
      workingDirectory: workingDir,
      verbose: true,
      androidSigningOptions: getKeystoreConfig(),
      exportEmbedOptions: {
        sourcemapOutput: sourcemapPath,
      },
      env: process.env,
    });

    // Verify and move repacked APK
    if (!fs.existsSync(repackedApk)) {
      throw new Error(`Repacked APK not found: ${repackedApk}`);
    }

    fs.copyFileSync(repackedApk, finalApk);
    fs.unlinkSync(repackedApk);
    fs.rmSync(workingDir, { recursive: true, force: true });

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 Android APK repack completed in ${duration}s`);

    if (fs.existsSync(sourcemapPath)) {
      logger.success(`Sourcemap: ${sourcemapPath}`);
    }

  } catch (error) {
    // Fallback: manual signing if repack failed (e.g. ENOENT for resigned.apk) but apktool-packed.apk exists
    const unsignedApk = path.join(workingDir, 'apktool-packed.apk');
    if (fs.existsSync(unsignedApk)) {
      logger.warn('Repack tool failed to sign/move APK. Attempting manual signing fallback...');
      
      const signer = findApkSigner();
      if (signer) {
        try {
          const config = getKeystoreConfig();
          // Ensure pass: prefix for CLI
          const ksPass = config.keyStorePassword.startsWith('pass:') ? config.keyStorePassword : `pass:${config.keyStorePassword}`;
          const keyPass = config.keyPassword.startsWith('pass:') ? config.keyPassword : `pass:${config.keyPassword}`;
          
          logger.info(`Signing manually with: ${signer}`);
          const cmd = `"${signer}" sign --ks "${config.keyStorePath}" --ks-key-alias "${config.keyAlias}" --ks-pass "${ksPass}" --key-pass "${keyPass}" --out "${repackedApk}" "${unsignedApk}"`;
          
          execSync(cmd, { stdio: 'inherit' });
          
          if (fs.existsSync(repackedApk)) {
             logger.success('Manual signing successful!');
             fs.copyFileSync(repackedApk, finalApk);
             fs.unlinkSync(repackedApk);
             fs.rmSync(workingDir, { recursive: true, force: true });
             
             const duration = Math.round((Date.now() - startTime) / 1000);
             logger.success(`🎉 Android APK repack completed (with manual signing) in ${duration}s`);
             return; // Success!
          }
        } catch (signError) {
          logger.error(`Manual signing failed: ${signError.message}`);
        }
      } else {
        logger.warn('apksigner not found, cannot manually sign.');
      }
    }

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
