#!/usr/bin/env node
/**
 * E2E App Repack Script using @expo/repack-app
 * Supports both Android APK and iOS .app repacking for CI optimization
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
 * Get directory size recursively
 */
function getDirSize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath);
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        calculateSize(path.join(itemPath, item));
      });
    }
  }
  
  try {
    calculateSize(dirPath);
    const bytes = totalSize;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  } catch (error) {
    return 'Unknown size';
  }
}

/**
 * Get CI keystore configuration for Android
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

    logger.info(`Main APK size: ${getFileSize(mainSourceApk)}`);

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
    logger.success(`Main APK: ${mainFinalApk} (${getFileSize(mainFinalApk)})`);

    // Check sourcemap
    if (fs.existsSync(sourcemapOutputPath)) {
      logger.success(`Sourcemap: ${sourcemapOutputPath} (${getFileSize(sourcemapOutputPath)})`);
    }

  } catch (error) {
    logger.error(`Android repack failed: ${error.message}`);
    throw error;
  }
}

/**
 * Repack iOS .app
 */
async function repackIOS() {
  const startTime = Date.now();

  try {
    // Configuration for iOS .app (simulator build)
    const sourceApp = 'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app';
    const repackedApp = 'ios/build/Build/Products/Release-iphonesimulator/MetaMask-repack.app';
    const finalApp = 'ios/build/Build/Products/Release-iphonesimulator/MetaMask.app';
    const sourcemapOutputPath = 'sourcemaps/ios/index.js.map';

    logger.info('🚀 Starting iOS E2E .app repack process...');
    logger.info(`Source .app: ${sourceApp}`);

    // Verify source .app exists
    if (!fs.existsSync(sourceApp)) {
      throw new Error(`iOS .app not found: ${sourceApp}`);
    }

    // Get size of .app bundle
    const appStats = fs.statSync(sourceApp);
    if (appStats.isDirectory()) {
      logger.info(`iOS .app bundle size: ${getDirSize(sourceApp)}`);
    }

    // Ensure sourcemap directory exists
    const sourcemapDir = path.dirname(sourcemapOutputPath);
    if (!fs.existsSync(sourcemapDir)) {
      fs.mkdirSync(sourcemapDir, { recursive: true });
    }

    // Dynamic import for ES module compatibility
    const { repackAppIosAsync } = await import('@expo/repack-app');

    // Create working directory
    const workingDir = 'ios/build/repack-working';
    if (!fs.existsSync(workingDir)) {
      fs.mkdirSync(workingDir, { recursive: true });
      logger.info(`Created working directory: ${workingDir}`);
    }

    // Repack iOS .app with updated JavaScript bundle
    // Note: Simulator builds don't require signing
    logger.info('⏱️  Repacking iOS .app with updated JavaScript...');
    await repackAppIosAsync({
      platform: 'ios',
      projectRoot: process.cwd(),
      sourceAppPath: sourceApp,
      outputPath: repackedApp,
      workingDirectory: workingDir,
      verbose: true,
      // No signing needed for simulator builds
      exportEmbedOptions: {
        sourcemapOutput: sourcemapOutputPath,
      },
      env: process.env,
    });

    // Verify repacked .app was created
    if (!fs.existsSync(repackedApp)) {
      throw new Error(`Repacked iOS .app not found: ${repackedApp}`);
    }

    // Remove old .app and rename repacked to final
    logger.info('Replacing original .app with repacked version...');
    fs.rmSync(finalApp, { recursive: true, force: true });
    fs.renameSync(repackedApp, finalApp);

    // Clean up temporary files
    fs.rmSync(workingDir, { recursive: true, force: true });
    logger.info('Cleaned up temporary files');

    const duration = Math.round((Date.now() - startTime) / 1000);
    logger.success(`🎉 iOS .app repack completed in ${duration}s`);
    logger.success(`iOS .app: ${finalApp} (${getDirSize(finalApp)})`);

    // Check sourcemap
    if (fs.existsSync(sourcemapOutputPath)) {
      logger.success(`Sourcemap: ${sourcemapOutputPath} (${getFileSize(sourcemapOutputPath)})`);
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
  // Parse command line arguments
  const args = process.argv.slice(2);
  const platform = args[0] || process.env.PLATFORM || 'android';

  logger.info(`🔧 Repack Platform: ${platform.toUpperCase()}`);
  logger.info(`📍 Working Directory: ${process.cwd()}`);
  logger.info(`🌍 Environment: ${process.env.CI ? 'CI' : 'Local'}`);

  try {
    switch (platform.toLowerCase()) {
      case 'android':
        await repackAndroid();
        break;
      case 'ios':
        await repackIOS();
        break;
      case 'both':
        logger.info('Running repacks for both platforms...');
        await repackAndroid();
        await repackIOS();
        break;
      default:
        throw new Error(`Unknown platform: ${platform}. Use 'android', 'ios', or 'both'`);
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

module.exports = { main, repackAndroid, repackIOS };
