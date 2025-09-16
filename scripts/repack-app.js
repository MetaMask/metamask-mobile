#!/usr/bin/env node

/**
 * Unified App Repacking Tool
 *
 * A cross-platform tool for repacking mobile app artifacts with updated JavaScript bundles.
 * Supports both Android APK and iOS .app bundle repacking.
 *
 * Usage:
 *   node scripts/repack-app.js --platform <android|ios> --input <artifact-path> --bundle <bundle-path>
 *   yarn repack --platform android --input app.apk --bundle bundle.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function validateInputs(platform, inputPath, bundlePath) {
  // Validate platform
  if (!['android', 'ios'].includes(platform)) {
    throw new Error(`Invalid platform: ${platform}. Must be 'android' or 'ios'`);
  }

  // Validate input artifact
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input artifact not found: ${inputPath}`);
  }

  // Validate bundle file
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Bundle file not found: ${bundlePath}`);
  }

  // Platform-specific validation
  if (platform === 'android') {
    if (!inputPath.endsWith('.apk')) {
      throw new Error(`Android platform requires APK file, got: ${inputPath}`);
    }
  } else if (platform === 'ios') {
    if (!fs.statSync(inputPath).isDirectory()) {
      throw new Error(`iOS platform requires .app directory, got: ${inputPath}`);
    }
    // Check for Info.plist in iOS bundle
    const infoPlist = path.join(inputPath, 'Info.plist');
    if (!fs.existsSync(infoPlist)) {
      throw new Error(`Invalid iOS .app bundle - missing Info.plist: ${inputPath}`);
    }
  }

  log(`Platform validation passed: ${platform}`);
}

function createBackup(inputPath) {
  const backupPath = `${inputPath}.backup.${Date.now()}`;

  if (fs.statSync(inputPath).isDirectory()) {
    // For directories (iOS .app bundles), use cp -r
    execSync(`cp -r "${inputPath}" "${backupPath}"`, { stdio: 'inherit' });
  } else {
    // For files (Android APKs), use cp
    execSync(`cp "${inputPath}" "${backupPath}"`, { stdio: 'inherit' });
  }

  log(`Created backup: ${backupPath}`);
  return backupPath;
}

function repackAndroid(inputPath, bundlePath) {
  log('Starting Android APK repacking...');

  try {
    execSync(`npx --yes @expo/repack-app --input "${inputPath}" --output "${inputPath}" --bundle "${bundlePath}"`, {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    log('Android APK repacking completed successfully');
  } catch (error) {
    throw new Error(`Android APK repacking failed: ${error.message}`);
  }
}

function findBundleLocation(appPath) {
  // Common locations for main.jsbundle in iOS .app bundles
  const possibleLocations = [
    'main.jsbundle',
    'www/main.jsbundle',
    'assets/main.jsbundle'
  ];

  for (const location of possibleLocations) {
    const fullPath = path.join(appPath, location);
    if (fs.existsSync(fullPath)) {
      log(`Found existing bundle at: ${location}`);
      return fullPath;
    }
  }

  // Look for any .jsbundle files
  try {
    const findResult = execSync(`find "${appPath}" -name "*.jsbundle" -type f 2>/dev/null | head -1`, {
      encoding: 'utf8'
    }).trim();

    if (findResult) {
      log(`Found bundle via find: ${path.relative(appPath, findResult)}`);
      return findResult;
    }
  } catch (error) {
    // find command failed or no bundle found
  }

  // Default location if nothing found
  const defaultLocation = path.join(appPath, 'main.jsbundle');
  log(`Using default bundle location: main.jsbundle`);
  return defaultLocation;
}

function repackIOS(inputPath, bundlePath) {
  log('Starting iOS .app bundle repacking...');

  // Find where the bundle should go in the .app
  const targetBundlePath = findBundleLocation(inputPath);

  // Copy the new bundle to replace the old one
  fs.copyFileSync(bundlePath, targetBundlePath);

  // Validate the new bundle
  const stats = fs.statSync(targetBundlePath);
  const bundleSize = stats.size;

  if (bundleSize < 100000) { // Less than 100KB is suspicious
    throw new Error(`Bundle size seems too small (${bundleSize} bytes) - repacking may have failed`);
  }

  log(`iOS bundle updated successfully (${bundleSize} bytes)`);
}

function validateRepackedArtifact(platform, inputPath, backupPath) {
  log('Validating repacked artifact...');

  try {
    if (platform === 'android') {
      // For Android, check if APK is larger than 1MB
      const stats = fs.statSync(inputPath);
      if (stats.size < 1000000) {
        throw new Error(`Repacked APK too small: ${stats.size} bytes`);
      }
    } else if (platform === 'ios') {
      // For iOS, check if .app directory exists and has reasonable size
      const stats = fs.statSync(inputPath);
      if (stats.size < 10000000) { // Less than 10MB is suspicious
        throw new Error(`Repacked .app bundle too small: ${stats.size} bytes`);
      }
    }

    log('Artifact validation passed');
  } catch (error) {
    log(`Validation failed: ${error.message}`, 'error');

    // Restore backup
    if (fs.existsSync(backupPath)) {
      log('Restoring backup...', 'warn');
      if (fs.statSync(backupPath).isDirectory()) {
        execSync(`rm -rf "${inputPath}" && mv "${backupPath}" "${inputPath}"`, { stdio: 'inherit' });
      } else {
        execSync(`mv "${backupPath}" "${inputPath}"`, { stdio: 'inherit' });
      }
    }

    throw error;
  }
}

function cleanupBackup(backupPath) {
  if (fs.existsSync(backupPath)) {
    if (fs.statSync(backupPath).isDirectory()) {
      execSync(`rm -rf "${backupPath}"`, { stdio: 'inherit' });
    } else {
      execSync(`rm -f "${backupPath}"`, { stdio: 'inherit' });
    }
    log('Cleaned up backup file');
  }
}

async function main() {
  const args = process.argv.slice(2);
  let platform = '';
  let inputPath = '';
  let bundlePath = '';
  let keepBackup = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--platform':
      case '-p':
        platform = args[++i];
        break;
      case '--input':
      case '-i':
        inputPath = args[++i];
        break;
      case '--bundle':
      case '-b':
        bundlePath = args[++i];
        break;
      case '--keep-backup':
      case '-k':
        keepBackup = true;
        break;
      default:
        if (args[i].startsWith('--platform=')) {
          platform = args[i].split('=')[1];
        } else if (args[i].startsWith('--input=')) {
          inputPath = args[i].split('=')[1];
        } else if (args[i].startsWith('--bundle=')) {
          bundlePath = args[i].split('=')[1];
        }
    }
  }

  if (!platform || !inputPath || !bundlePath) {
    console.error('Usage: node scripts/repack-app.js --platform <android|ios> --input <artifact-path> --bundle <bundle-path>');
    console.error('  --platform, -p: Platform (android or ios)');
    console.error('  --input, -i: Path to app artifact (APK file or .app directory)');
    console.error('  --bundle, -b: Path to JavaScript bundle file');
    console.error('  --keep-backup, -k: Keep backup file after successful repacking');
    console.error('');
    console.error('Examples:');
    console.error('  yarn repack --platform android --input app.apk --bundle bundle.js');
    console.error('  yarn repack --platform ios --input MyApp.app --bundle main.jsbundle');
    process.exit(1);
  }

  try {
    log(`🚀 Starting unified app repacking for ${platform}`);

    // Step 1: Validate inputs
    validateInputs(platform, inputPath, bundlePath);

    // Step 2: Create backup
    const backupPath = createBackup(inputPath);

    // Step 3: Repack based on platform
    if (platform === 'android') {
      repackAndroid(inputPath, bundlePath);
    } else if (platform === 'ios') {
      repackIOS(inputPath, bundlePath);
    }

    // Step 4: Validate repacked artifact
    validateRepackedArtifact(platform, inputPath, backupPath);

    // Step 5: Clean up backup (unless --keep-backup is specified)
    if (!keepBackup) {
      cleanupBackup(backupPath);
    } else {
      log(`Backup kept at: ${backupPath}`);
    }

    log(`✅ Unified app repacking completed successfully for ${platform}!`);
    log(`🎯 Updated artifact ready: ${inputPath}`);

  } catch (error) {
    log(`❌ Error during unified app repacking: ${error.message}`, 'error');
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { main };
