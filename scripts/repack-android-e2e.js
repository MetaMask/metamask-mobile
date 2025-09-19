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
    const sourceApkPath = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk';
    const repackedApkPath = 'android/app/build/outputs/apk/prod/release/app-prod-release-repack.apk';
    const finalApkPath = 'android/app/build/outputs/apk/prod/release/app-prod-release.apk'; // CI expects this name
    const sourcemapOutputPath = 'sourcemaps/android/index.android.bundle.map';

    logger.info('🚀 Starting Android E2E APK repack process...');
    logger.info(`Source APK: ${sourceApkPath}`);
    logger.info(`Repacked APK: ${repackedApkPath}`);
    logger.info(`Final APK: ${finalApkPath}`);

    // Verify source APK exists
    if (!fs.existsSync(sourceApkPath)) {
      throw new Error(`Source APK not found: ${sourceApkPath}`);
    }

    logger.info(`Source APK size: ${getFileSize(sourceApkPath)}`);

    // Ensure sourcemap directory exists
    const sourcemapDir = path.dirname(sourcemapOutputPath);
    if (!fs.existsSync(sourcemapDir)) {
      fs.mkdirSync(sourcemapDir, { recursive: true });
    }

    // Dynamic import for ES module compatibility
    const { repackAppAndroidAsync } = await import('@expo/repack-app');

    // Create working directory in project filesystem to avoid cross-device issues
    const workingDir = 'android/app/build/repack-working';
    if (!fs.existsSync(workingDir)) {
      fs.mkdirSync(workingDir, { recursive: true });
      logger.info(`Created working directory: ${workingDir}`);
    }

    // Use official API with working directory in same filesystem
    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: sourceApkPath,
      outputPath: repackedApkPath,
      workingDirectory: workingDir,  // Force library to use project filesystem
      verbose: true,
      exportEmbedOptions: {
        sourcemapOutput: sourcemapOutputPath,
      },
      env: process.env,
    });

    // Verify repacked APK was created
    if (!fs.existsSync(repackedApkPath)) {
      throw new Error(`Repacked APK not found: ${repackedApkPath}`);
    }

    // Copy repacked APK to final location that CI expects (avoids cross-device issues)
    logger.info('Copying repacked APK to final location for CI...');
    fs.copyFileSync(repackedApkPath, finalApkPath);
    fs.unlinkSync(repackedApkPath);

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 APK repack completed in ${duration}s`);
    logger.success(`Final APK: ${finalApkPath} (${getFileSize(finalApkPath)})`);

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