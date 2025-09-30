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

/**
 * Get Android keystore configuration
 */
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

  const config = {
    keyStorePath: keystorePath || 'android/app/debug.keystore',
    keyStorePassword: `pass:${keystorePassword || 'android'}`,
    keyAlias: keyAlias || 'androiddebugkey',
    keyPassword: `pass:${keyPassword || 'android'}`,
  };

  logger.info(`Using keystore: ${config.keyStorePath}`);
  logger.info(`Using key alias: ${config.keyAlias}`);
  return config;
}

/**
 * Repack Android APK
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
    logger.error(`Android repack failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main entry point
 */
async function main() {
  // This script is now Android-specific
  logger.info(`🔧 Repack Platform: ANDROID`);
  logger.info(`📍 Working Directory: ${process.cwd()}`);
  logger.info(`🌍 Environment: ${process.env.CI ? 'CI' : 'Local'}`);

  try {
    await repackAndroid();
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

module.exports = { main, repackAndroid };