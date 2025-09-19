#!/usr/bin/env node

/**
 * Android E2E APK Repack Script using @expo/repack-app
 * 
 * Simple implementation following official documentation exactly.
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
 * Main repack process - following official documentation exactly
 */
async function main() {
  const startTime = Date.now();

  try {
    // Configuration for both APKs
    const mainSourceApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
    const mainRepackedApk = 'android/app/build/outputs/apk/prod/release/app-prod-release-repack.apk';
    const mainFinalApk = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
    const testSourceApk = 'android/app/build/outputs/apk/androidTest/prod/release/app-prod-release-androidTest.apk';
    const testRepackedApk = 'android/app/build/outputs/apk/androidTest/prod/release/app-prod-release-androidTest-repack.apk';
    const testFinalApk = 'android/app/build/outputs/apk/androidTest/prod/release/app-prod-release-androidTest.apk';
    const sourcemapOutputPath = 'sourcemaps/android/index.android.bundle.map';

    logger.info('🚀 Starting Android E2E APK repack process (BOTH APKs)...');
    logger.info(`Main Source APK: ${mainSourceApk}`);
    logger.info(`Test Source APK: ${testSourceApk}`);
    logger.info(`Repacking both APKs with matching signatures...`);

    // Verify both source APKs exist
    if (!fs.existsSync(mainSourceApk)) {
      throw new Error(`Main APK not found: ${mainSourceApk}`);
    }
    if (!fs.existsSync(testSourceApk)) {
      throw new Error(`Test APK not found: ${testSourceApk}`);
    }

    logger.info(`Main APK size: ${getFileSize(mainSourceApk)}`);
    logger.info(`Test APK size: ${getFileSize(testSourceApk)}`);

    // Ensure sourcemap directory exists
    const sourcemapDir = path.dirname(sourcemapOutputPath);
    if (!fs.existsSync(sourcemapDir)) {
      fs.mkdirSync(sourcemapDir, { recursive: true });
    }

    // Dynamic import for ES module compatibility
    const { repackAppAndroidAsync } = await import('@expo/repack-app');

    // Create working directories in same filesystem to avoid cross-device issues
    const mainWorkingDir = 'android/app/build/repack-working-main';
    const testWorkingDir = 'android/app/build/repack-working-test';

    [mainWorkingDir, testWorkingDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created working directory: ${dir}`);
      }
    });

    // Common signing configuration for both APKs to ensure matching signatures
    const signingOptions = {
      keyStorePath: 'android/app/debug.keystore',
      keyStorePassword: 'pass:android',
      keyAlias: 'androiddebugkey', 
      keyPassword: 'pass:android',
    };

    // Step 1: Repack main APK with updated JavaScript bundle
    logger.info('⏱️  Step 1: Repacking main APK with updated JavaScript...');
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

    // Step 2: Repack test APK to match signature (no JS bundle changes needed)
    logger.info('⏱️  Step 2: Repacking test APK to match signature...');
    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: testSourceApk,
      outputPath: testRepackedApk,
      workingDirectory: testWorkingDir,
      verbose: true,
      androidSigningOptions: signingOptions, // Same signing = matching signature
      // No exportEmbedOptions needed - test APK doesn't have JS bundle
      env: process.env,
    });

    // Verify both repacked APKs were created
    if (!fs.existsSync(mainRepackedApk)) {
      throw new Error(`Repacked main APK not found: ${mainRepackedApk}`);
    }
    if (!fs.existsSync(testRepackedApk)) {
      throw new Error(`Repacked test APK not found: ${testRepackedApk}`);
    }

    // Copy both repacked APKs to final locations that CI expects
    logger.info('Copying repacked APKs to final locations for CI...');
    fs.copyFileSync(mainRepackedApk, mainFinalApk);
    fs.copyFileSync(testRepackedApk, testFinalApk);

    // Clean up temporary files and directories
    fs.unlinkSync(mainRepackedApk);
    fs.unlinkSync(testRepackedApk);
    fs.rmSync(mainWorkingDir, { recursive: true, force: true });
    fs.rmSync(testWorkingDir, { recursive: true, force: true });
    logger.info('Cleaned up temporary APK files and working directories');

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 BOTH APKs repack completed in ${duration}s`);
    logger.success(`Main APK: ${mainFinalApk} (${getFileSize(mainFinalApk)})`);
    logger.success(`Test APK: ${testFinalApk} (${getFileSize(testFinalApk)})`);

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
