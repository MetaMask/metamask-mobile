#!/usr/bin/env node

/**
 * Android E2E APK Repack Script using @expo/repack-app programmatic API
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  sourceApkPath: 'android/app/build/outputs/apk/prod/release/app-prod-release.apk',
  outputApkPath: 'android/app/build/outputs/apk/prod/release/app-prod-release.apk',
  sourcemapOutputPath: 'sourcemaps/android/index.android.bundle.map',
};

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
 * Check if file exists and has size > 0
 */
function fileExists(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() && stats.size > 0;
  } catch (error) {
    return false;
  }
}

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
 * Main repack process using programmatic API
 */
async function main() {
  const startTime = Date.now();

  try {
    logger.info('🚀 Starting Android E2E APK repack process...');
    logger.info(`Source APK: ${CONFIG.sourceApkPath}`);
    logger.info(`Output APK: ${CONFIG.outputApkPath}`);

    // Verify source APK exists
    if (!fileExists(CONFIG.sourceApkPath)) {
      throw new Error(`Source APK not found: ${CONFIG.sourceApkPath}`);
    }

    logger.info(`Source APK size: ${getFileSize(CONFIG.sourceApkPath)}`);

    // Ensure sourcemap directory exists
    const sourcemapDir = path.dirname(CONFIG.sourcemapOutputPath);
    if (!fs.existsSync(sourcemapDir)) {
      fs.mkdirSync(sourcemapDir, { recursive: true });
      logger.info(`Created directory: ${sourcemapDir}`);
    }

    // Use programmatic API for maximum efficiency
    logger.info('⏱️  Starting repack with programmatic API...');

    // Dynamic import for ES module compatibility
    const { repackAppAndroidAsync } = await import('@expo/repack-app');

    await repackAppAndroidAsync({
      platform: 'android',
      projectRoot: process.cwd(),
      sourceAppPath: CONFIG.sourceApkPath,
      outputPath: CONFIG.outputApkPath,
      verbose: true,
      exportEmbedOptions: {
        sourcemapOutput: CONFIG.sourcemapOutputPath,
      },
      // Pass through all environment variables to ensure identical bundle
      env: process.env,
    });

    // Verify final APK
    if (!fileExists(CONFIG.outputApkPath)) {
      throw new Error(`Repacked APK not found: ${CONFIG.outputApkPath}`);
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 APK repack completed successfully in ${duration}s`);
    logger.success(`Final APK: ${CONFIG.outputApkPath} (${getFileSize(CONFIG.outputApkPath)})`);

    // Check sourcemap
    if (fileExists(CONFIG.sourcemapOutputPath)) {
      logger.success(`Sourcemap: ${CONFIG.sourcemapOutputPath} (${getFileSize(CONFIG.sourcemapOutputPath)})`);
    } else {
      logger.warn('Sourcemap not generated - this may be expected');
    }

  } catch (error) {
    logger.error(`Repack process failed: ${error.message}`);

    // Debug information
    if (error.stack) {
      logger.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.warn('Process interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.warn('Process terminated');
  process.exit(1);
});

// Run the main process
if (require.main === module) {
  main().catch(error => {
    console.error(`❌ Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, CONFIG };
