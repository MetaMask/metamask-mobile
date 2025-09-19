#!/usr/bin/env node

/**
 * Android E2E APK Repack Script using @expo/repack-app
 * This script uses @expo/repack-app to efficiently repack an existing APK
 */

const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  platform: 'android',
  sourceApkPath: 'android/app/build/outputs/apk/prod/release/app-prod-release.apk',
  outputApkPath: 'android/app/build/outputs/apk/prod/release/app-prod-release.apk', // ← Fixed: overwrites original
  tempApkPath: 'android/app/build/outputs/apk/prod/release/app-prod-release-temp.apk',
  bundleOutputPath: 'android/app/build/generated/assets/createBundleProdRelease/index.android.bundle',
  sourcemapOutputPath: 'sourcemaps/android/index.android.bundle.map',
  assetsPath: 'android/app/build/generated/res/createBundleProdRelease',
};

/**
 * Logger utility for consistent output formatting
 */
const logger = {
  info: (msg) => console.log(`📦 ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  warn: (msg) => console.warn(`⚠️  ${msg}`),
};

/**
 * Execute a command and handle errors
 */
function execCommand(command, options = {}) {
  logger.info(`Executing: ${command}`);
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      encoding: 'utf8',
      ...options,
    });
    return result;
  } catch (error) {
    logger.error(`Command failed: ${command}`);
    logger.error(`Error: ${error.message}`);
    throw error;
  }
}

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
 * Generate new JavaScript bundle with current environment
 */
function generateJavaScriptBundle() {
  logger.info('Generating new JavaScript bundle...');

  // Ensure output directories exist
  const bundleDir = path.dirname(CONFIG.bundleOutputPath);
  const sourcemapDir = path.dirname(CONFIG.sourcemapOutputPath);
  const assetsDir = CONFIG.assetsPath;

  [bundleDir, sourcemapDir, assetsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });

  // Generate the bundle using React Native CLI
  const bundleCommand = [
    'yarn react-native bundle',
    '--platform android',
    '--dev false',
    '--entry-file index.js',
    `--bundle-output ${CONFIG.bundleOutputPath}`,
    `--assets-dest ${CONFIG.assetsPath}`,
    `--sourcemap-output ${CONFIG.sourcemapOutputPath}`,
    '--minify true',
  ].join(' ');

  execCommand(bundleCommand);

  // Verify bundle was created
  if (!fileExists(CONFIG.bundleOutputPath)) {
    throw new Error(`JavaScript bundle not found at: ${CONFIG.bundleOutputPath}`);
  }

  logger.success(`Bundle generated: ${CONFIG.bundleOutputPath} (${getFileSize(CONFIG.bundleOutputPath)})`);
  logger.success(`Sourcemap generated: ${CONFIG.sourcemapOutputPath} (${getFileSize(CONFIG.sourcemapOutputPath)})`);
}

/**
 * Use @expo/repack-app to repack the APK with new bundle
 */
function repackApk() {
  logger.info('Repacking APK with @expo/repack-app...');

  // Verify source APK exists
  if (!fileExists(CONFIG.sourceApkPath)) {
    throw new Error(`Source APK not found: ${CONFIG.sourceApkPath}`);
  }

  logger.info(`Source APK: ${CONFIG.sourceApkPath} (${getFileSize(CONFIG.sourceApkPath)})`);

  // Prepare repack command
  const repackCommand = [
    'npx @expo/repack-app',
    `--platform ${CONFIG.platform}`,
    `--source-app "${CONFIG.sourceApkPath}"`,
    `--output "${CONFIG.tempApkPath}"`,
    '--verbose',
  ].join(' ');

  // Execute repack command
  execCommand(repackCommand);

  // Verify repacked APK was created
  if (!fileExists(CONFIG.tempApkPath)) {
    throw new Error(`Repacked APK not found: ${CONFIG.tempApkPath}`);
  }

  // Replace original APK with repacked version
  // Note: sourceApkPath and outputApkPath are the same, so we're overwriting the original
  if (fs.existsSync(CONFIG.outputApkPath)) {
    logger.info(`Replacing original APK with repacked version...`);
    fs.unlinkSync(CONFIG.outputApkPath);
  }

  // Move temp APK to final location (overwrites original)
  fs.renameSync(CONFIG.tempApkPath, CONFIG.outputApkPath);

  logger.success(`APK repacked successfully: ${CONFIG.outputApkPath} (${getFileSize(CONFIG.outputApkPath)})`);
  logger.success(`Original APK has been replaced with repacked version`);
}

/**
 * Clean up temporary files
 */
function cleanup() {
  logger.info('Cleaning up temporary files...');

  const tempFiles = [CONFIG.tempApkPath];

  tempFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      logger.info(`Removed: ${file}`);
    }
  });
}

/**
 * Main repack process
 */
async function main() {
  const startTime = Date.now();

  try {
    logger.info('🚀 Starting Android E2E APK repack process...');
    logger.info(`Platform: ${CONFIG.platform}`);
    logger.info(`Source APK: ${CONFIG.sourceApkPath}`);
    logger.info(`Output APK: ${CONFIG.outputApkPath}`);

    // Step 1: Generate new JavaScript bundle
    generateJavaScriptBundle();

    // Step 2: Repack APK using @expo/repack-app
    repackApk();

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 APK repack completed successfully in ${duration}s`);
    logger.success(`Final APK: ${CONFIG.outputApkPath}`);

  } catch (error) {
    logger.error(`Repack process failed: ${error.message}`);
    process.exit(1);
  } finally {
    // Always clean up temporary files
    cleanup();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  logger.warn('Process interrupted, cleaning up...');
  cleanup();
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.warn('Process terminated, cleaning up...');
  cleanup();
  process.exit(1);
});

// Run the main process
if (require.main === module) {
  main().catch(error => {
    logger.error(`Unhandled error: ${error.message}`);
    cleanup();
    process.exit(1);
  });
}

module.exports = { main, CONFIG };
