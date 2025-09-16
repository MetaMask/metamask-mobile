#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'info' ? 'ℹ️' : '✅';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function createBackup(inputPath) {
  const backupPath = `${inputPath}.backup.${Date.now()}`;

  try {
    if (fs.statSync(inputPath).isDirectory()) {
      // For directories (iOS .app bundles), use cp -r
      execSync(`cp -r "${inputPath}" "${backupPath}"`, { stdio: 'pipe' });
    } else {
      // For files (Android APKs), use cp
      execSync(`cp "${inputPath}" "${backupPath}"`, { stdio: 'pipe' });
    }
    log('info', `Created backup: ${path.basename(backupPath)}`);
    return backupPath;
  } catch (error) {
    log('warn', `Failed to create backup: ${error.message}`);
    return null;
  }
}

function restoreBackup(backupPath, originalPath) {
  if (!backupPath || !fs.existsSync(backupPath)) {
    log('error', 'No backup available to restore');
    return false;
  }

  try {
    if (fs.statSync(backupPath).isDirectory()) {
      execSync(`rm -rf "${originalPath}" && mv "${backupPath}" "${originalPath}"`, { stdio: 'pipe' });
    } else {
      execSync(`mv "${backupPath}" "${originalPath}"`, { stdio: 'pipe' });
    }
    log('info', 'Restored from backup');
    return true;
  } catch (error) {
    log('error', `Failed to restore backup: ${error.message}`);
    return false;
  }
}

function cleanupBackup(backupPath) {
  if (backupPath && fs.existsSync(backupPath)) {
    try {
      if (fs.statSync(backupPath).isDirectory()) {
        execSync(`rm -rf "${backupPath}"`, { stdio: 'pipe' });
      } else {
        execSync(`rm -f "${backupPath}"`, { stdio: 'pipe' });
      }
      log('info', 'Cleaned up backup');
    } catch (error) {
      log('warn', `Failed to cleanup backup: ${error.message}`);
    }
  }
}

function validateInputFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    throw new Error(`${description} is not a file: ${filePath}`);
  }

  if (stats.size === 0) {
    throw new Error(`${description} is empty: ${filePath}`);
  }

  log('info', `${description} validated: ${stats.size} bytes`);
  return stats;
}

function validateIOSAppBundle(appPath) {
  if (!fs.existsSync(appPath)) {
    throw new Error(`iOS app bundle not found: ${appPath}`);
  }

  const stats = fs.statSync(appPath);
  if (!stats.isDirectory()) {
    throw new Error(`iOS app bundle is not a directory: ${appPath}`);
  }

  // Check for Info.plist (required for iOS app bundles)
  const infoPlist = path.join(appPath, 'Info.plist');
  if (!fs.existsSync(infoPlist)) {
    throw new Error(`Invalid iOS app bundle - missing Info.plist: ${appPath}`);
  }

  log('info', `iOS app bundle validated: ${appPath}`);
  return stats;
}

function findIOSBundleLocation(appPath) {
  // Common locations for main.jsbundle in iOS .app bundles
  const possibleLocations = [
    'main.jsbundle',
    'www/main.jsbundle',
    'assets/main.jsbundle',
    'bundle/main.jsbundle'
  ];

  // First, look for existing bundle files
  for (const location of possibleLocations) {
    const fullPath = path.join(appPath, location);
    if (fs.existsSync(fullPath)) {
      log('info', `Found existing bundle at: ${location}`);
      return fullPath;
    }
  }

  // If no existing bundle, use the standard location
  const defaultLocation = path.join(appPath, 'main.jsbundle');
  log('info', `Using default bundle location: main.jsbundle`);
  return defaultLocation;
}

function repackAndroid(inputPath, bundlePath) {
  log('info', 'Starting Android APK repacking...');

  const originalStats = fs.statSync(inputPath);
  const bundleStats = fs.statSync(bundlePath);

  log('info', `Original APK size: ${originalStats.size} bytes`);
  log('info', `Bundle size: ${bundleStats.size} bytes`);

  try {
    execSync(`npx --yes @expo/repack-app --input "${inputPath}" --output "${inputPath}" --bundle "${bundlePath}"`, {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    // Validate the repacked APK
    const repackedStats = fs.statSync(inputPath);
    log('info', `Repacked APK size: ${repackedStats.size} bytes`);

    // Basic validation - repacked APK should be similar in size
    const sizeDiff = Math.abs(repackedStats.size - originalStats.size);
    const maxDiff = Math.max(originalStats.size * 0.1, 1024 * 1024); // 10% or 1MB minimum

    if (sizeDiff > maxDiff) {
      throw new Error(`APK size changed significantly (${sizeDiff} bytes difference)`);
    }

    // Verify APK is still valid using unzip (basic check)
    try {
      execSync(`unzip -q -t "${inputPath}" | head -1`, { stdio: 'pipe' });
      log('info', 'APK structure validation passed');
    } catch (error) {
      throw new Error(`APK validation failed: ${error.message}`);
    }

  } catch (error) {
    throw new Error(`Android APK repacking failed: ${error.message}`);
  }
}

function repackIOS(inputPath, bundlePath) {
  log('info', 'Starting iOS .app bundle repacking...');

  const bundleStats = fs.statSync(bundlePath);
  log('info', `Bundle size: ${bundleStats.size} bytes`);

  // Find where to place the bundle
  const targetBundlePath = findIOSBundleLocation(inputPath);

  // Ensure the target directory exists
  const targetDir = path.dirname(targetBundlePath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    log('info', `Created directory: ${targetDir}`);
  }

  // Copy the bundle
  try {
    fs.copyFileSync(bundlePath, targetBundlePath);

    // Validate the copied bundle
    const copiedStats = fs.statSync(targetBundlePath);
    if (copiedStats.size !== bundleStats.size) {
      throw new Error(`Bundle copy failed - size mismatch (${copiedStats.size} vs ${bundleStats.size})`);
    }

    if (copiedStats.size < 100000) {
      throw new Error(`Bundle too small: ${copiedStats.size} bytes`);
    }

    log('info', `Bundle updated successfully: ${copiedStats.size} bytes`);

  } catch (error) {
    throw new Error(`iOS bundle update failed: ${error.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let platform = '', inputPath = '', bundlePath = '';

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform' || args[i] === '-p') platform = args[++i];
    else if (args[i] === '--input' || args[i] === '-i') inputPath = args[++i];
    else if (args[i] === '--bundle' || args[i] === '-b') bundlePath = args[++i];
    else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
Unified App Repacking Tool

Usage: node scripts/repack-app.js [options]

Options:
  -p, --platform <platform>    Target platform: android or ios (required)
  -i, --input <path>          Path to input artifact (APK for Android, .app for iOS) (required)
  -b, --bundle <path>         Path to JavaScript bundle file (required)
  -h, --help                  Show this help message

Examples:
  node scripts/repack-app.js --platform android --input app.apk --bundle bundle.js
  node scripts/repack-app.js -p ios -i MyApp.app -b main.jsbundle
      `);
      process.exit(0);
    }
  }

  // Validate required arguments
  if (!platform || !inputPath || !bundlePath) {
    console.error('❌ Missing required arguments');
    console.error('Usage: node scripts/repack-app.js --platform <android|ios> --input <path> --bundle <path>');
    console.error('Use --help for more information');
    process.exit(1);
  }

  // Validate platform
  if (!['android', 'ios'].includes(platform)) {
    console.error(`❌ Invalid platform: ${platform}. Must be 'android' or 'ios'`);
    process.exit(1);
  }

  let backupPath = null;

  try {
    log('info', `Starting repacking process for ${platform} platform`);
    log('info', `Input artifact: ${inputPath}`);
    log('info', `Bundle file: ${bundlePath}`);

    // Validate inputs based on platform
    if (platform === 'android') {
      validateInputFile(inputPath, 'Android APK');
      validateInputFile(bundlePath, 'JavaScript bundle');
    } else {
      validateIOSAppBundle(inputPath);
      validateInputFile(bundlePath, 'JavaScript bundle');
    }

    // Create backup before modifying
    backupPath = createBackup(inputPath);
    if (!backupPath) {
      log('warn', 'Proceeding without backup - operation may not be recoverable on failure');
    }

    // Perform repacking
    if (platform === 'android') {
      repackAndroid(inputPath, bundlePath);
    } else {
      repackIOS(inputPath, bundlePath);
    }

    // Success - cleanup backup
    if (backupPath) {
      cleanupBackup(backupPath);
    }

    log('info', `✅ Repacking completed successfully for ${platform} platform!`);

  } catch (error) {
    log('error', `Repacking failed: ${error.message}`);

    // Attempt to restore from backup
    if (backupPath && restoreBackup(backupPath, inputPath)) {
      log('info', 'Original artifact has been restored from backup');
    } else {
      log('error', 'Failed to restore original artifact - it may be corrupted');
    }

    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { main };
