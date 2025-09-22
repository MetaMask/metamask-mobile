#!/usr/bin/env node
/**
 * Android E2E APK Repack Script using @expo/repack-app
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
 * Get file size in human readable format
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const bytes = stats.size;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  } catch (error) {
    return 'Unknown size';
  }
}

/**
 * Get CI keystore configuration from environment
 */
function getCiKeystoreConfig() {
  // CI environment provides keystore configuration via setup-e2e-env
  const keystorePath = process.env.ANDROID_KEYSTORE_PATH || 'android/app/debug.keystore';
  const keystorePassword = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PASSWORD || 'android';
  const keyAlias = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_ALIAS || 'androiddebugkey';
  const keyPassword = process.env.BITRISEIO_ANDROID_QA_KEYSTORE_PRIVATE_KEY_PASSWORD || 'android';

  logger.info(`Using keystore: ${keystorePath}`);
  logger.info(`Using key alias: ${keyAlias}`);

  return {
    keyStorePath: keystorePath,
    keyStorePassword: `pass:${keystorePassword}`,
    keyAlias,
    keyPassword: `pass:${keyPassword}`,
  };
}

/**
 * Main repack process using CI keystore configuration
 */
async function main() {
  const startTime = Date.now();

  try {
    // Configuration for main APK only
    const mainSourceApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
    const mainRepackedApk = 'android/app/build/outputs/apk/prod/release/app-prod-release-repack.apk';
    const mainFinalApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
    const sourcemapOutputPath = 'sourcemaps/android/index.android.bundle.map';

    logger.info('🚀 Starting Android E2E APK repack process...');
    logger.info(`Main Source APK: ${mainSourceApk}`);
    logger.info(`Using CI keystore configuration for signature compatibility...`);

    // Verify main source APK exists
    if (!fs.existsSync(mainSourceApk)) {
      throw new Error(`Main APK not found: ${mainSourceApk}`);
    }

    logger.info(`Main APK size: ${getFileSize(mainSourceApk)}`);

    // Ensure sourcemap directory exists
    const sourcemapDir = path.dirname(sourcemapOutputPath);
    if (!fs.existsSync(sourcemapDir)) {
      fs.mkdirSync(sourcemapDir, { recursive: true });
    }

    // Dynamic import for ES module compatibility
    const { repackAppAndroidAsync } = await import('@expo/repack-app');

    // Create working directory for main APK repack
    const mainWorkingDir = 'android/app/build/repack-working-main';

    if (!fs.existsSync(mainWorkingDir)) {
      fs.mkdirSync(mainWorkingDir, { recursive: true });
      logger.info(`Created working directory: ${mainWorkingDir}`);
    }

    // Get CI keystore configuration (same as original build)
    const signingOptions = getCiKeystoreConfig();

    // Repack main APK with updated JavaScript bundle using CI keystore
    logger.info('⏱️  Repacking main APK with updated JavaScript and CI keystore...');
    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: mainSourceApk,
      outputPath: mainRepackedApk,
      workingDirectory: mainWorkingDir,
      verbose: true,
      androidSigningOptions: signingOptions, // Use same keystore as original build
      exportEmbedOptions: {
        sourcemapOutput: sourcemapOutputPath,
      },
      env: process.env,
    });

    // Verify repacked APK was created
    if (!fs.existsSync(mainRepackedApk)) {
      throw new Error(`Repacked main APK not found: ${mainRepackedApk}`);
    }

    // Copy repacked APK to final location that CI expects
    logger.info('Copying repacked APK to final location for CI...');
    fs.copyFileSync(mainRepackedApk, mainFinalApk);

    // Clean up temporary files
    fs.unlinkSync(mainRepackedApk);
    fs.rmSync(mainWorkingDir, { recursive: true, force: true });
    logger.info('Cleaned up temporary files');

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 APK repack completed in ${duration}s`);
    logger.success(`Main APK: ${mainFinalApk} (${getFileSize(mainFinalApk)})`);
    logger.success(`Test APK: Original (matching signature via CI keystore)`);

    // Check sourcemap
    if (fs.existsSync(sourcemapOutputPath)) {
      logger.success(`Sourcemap: ${sourcemapOutputPath} (${getFileSize(sourcemapOutputPath)})`);
    }

  } catch (error) {
    logger.error(`Repack failed: ${error.message}`);
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

module.exports = { main };
