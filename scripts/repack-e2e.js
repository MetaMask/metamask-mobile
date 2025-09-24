#!/usr/bin/env node
/**
 * E2E App Repack Script using @expo/repack-app
 * Supports Android APK repacking for CI optimization
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
 * Get CI keystore configuration for Android
 */
function getCiKeystoreConfig() {
  const isCI = !!process.env.CI;
  const keystorePath = process.env.ANDROID_KEYSTORE_PATH;
  const keystorePassword = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD;
  const keyAlias = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS;
  const keyPassword = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD;

  if (isCI) {
    // In CI, all keystore env vars must be set
    if (!keystorePath || !keystorePassword || !keyAlias || !keyPassword) {
      logger.error(
        'Missing required Android keystore environment variables in CI. ' +
        'Please ensure ANDROID_KEYSTORE_PATH, BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD, ' +
        'BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS, and BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD are set.'
      );
      process.exit(1);
    }
  }

  // Use defaults only in local/dev environments
  const finalKeystorePath = keystorePath || 'android/app/debug.keystore';
  const finalKeystorePassword = keystorePassword || 'android';
  const finalKeyAlias = keyAlias || 'androiddebugkey';
  const finalKeyPassword = keyPassword || 'android';

  logger.info(`Using keystore: ${finalKeystorePath}`);
  logger.info(`Using key alias: ${finalKeyAlias}`);

  return {
    keyStorePath: finalKeystorePath,
    keyStorePassword: `pass:${finalKeystorePassword}`,
    keyAlias: finalKeyAlias,
    keyPassword: `pass:${finalKeyPassword}`,
  };
}

/**
 * Repack Android APK
 */
async function repackAndroid() {
  const startTime = Date.now();

  try {
    // Configuration for main APK
    const mainSourceApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
    const mainRepackedApk = 'android/app/build/outputs/apk/prod/release/app-prod-release-repack.apk';
    const mainFinalApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
    const sourcemapOutputPath = 'sourcemaps/android/index.android.bundle.map';

    logger.info('🚀 Starting Android E2E APK repack process...');
    logger.info(`Main Source APK: ${mainSourceApk}`);

    // Verify main source APK exists
    if (!fs.existsSync(mainSourceApk)) {
      throw new Error(`Main APK not found: ${mainSourceApk}`);
    }

    // Ensure sourcemap directory exists
    const sourcemapDir = path.dirname(sourcemapOutputPath);
    if (!fs.existsSync(sourcemapDir)) {
      fs.mkdirSync(sourcemapDir, { recursive: true });
    }

    // Dynamic import for ES module compatibility
    const { repackAppAndroidAsync } = await import('@expo/repack-app');

    // Create working directory
    const mainWorkingDir = 'android/app/build/repack-working-main';
    if (!fs.existsSync(mainWorkingDir)) {
      fs.mkdirSync(mainWorkingDir, { recursive: true });
      logger.info(`Created working directory: ${mainWorkingDir}`);
    }

    // Get CI keystore configuration
    const signingOptions = getCiKeystoreConfig();

    // Repack main APK with updated JavaScript bundle
    logger.info('⏱️  Repacking main APK with updated JavaScript...');
    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: mainSourceApk,
      outputPath: mainRepackedApk,
      workingDirectory: mainWorkingDir,
      verbose: true,
      androidSigningOptions: signingOptions,
      exportEmbedOptions: {
        sourcemapOutput: sourcemapOutputPath,
      },
      env: process.env,
    });

    // Verify repacked APK was created
    if (!fs.existsSync(mainRepackedApk)) {
      throw new Error(`Repacked main APK not found: ${mainRepackedApk}`);
    }

    // Copy repacked APK to final location
    logger.info('Copying repacked APK to final location...');
    fs.copyFileSync(mainRepackedApk, mainFinalApk);

    // Clean up temporary files
    fs.unlinkSync(mainRepackedApk);
    fs.rmSync(mainWorkingDir, { recursive: true, force: true });
    logger.info('Cleaned up temporary files');

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 Android APK repack completed in ${duration}s`);

    // Check sourcemap
    if (fs.existsSync(sourcemapOutputPath)) {
      logger.success(`Sourcemap: ${sourcemapOutputPath}`);
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
