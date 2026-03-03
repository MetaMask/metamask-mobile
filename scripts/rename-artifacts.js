#!/usr/bin/env node
/**
 * Rename build artifacts with standardized naming convention.
 * Called after Android/iOS builds complete to rename outputs.
 *
 * Usage:
 *   node scripts/rename-artifacts.js android
 *   node scripts/rename-artifacts.js ios
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const platform = process.argv[2];

if (!platform || !['android', 'ios'].includes(platform)) {
  console.error('Usage: node scripts/rename-artifacts.js <android|ios>');
  process.exit(1);
}

// Get version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'),
);
const appVersion = packageJson.version;

// Get build number from environment (GitHub Actions run number or 1 for local)
const buildNumber = process.env.GITHUB_RUN_NUMBER || '1';

// Required env vars
const buildType = process.env.METAMASK_BUILD_TYPE;
const environment = process.env.METAMASK_ENVIRONMENT;
const configuration = process.env.CONFIGURATION;

if (!buildType || !environment) {
  console.error(
    '❌ Required env vars not set: METAMASK_BUILD_TYPE, METAMASK_ENVIRONMENT',
  );
  process.exit(1);
}

/**
 * Find files matching a pattern
 */
function findFiles(dir, pattern) {
  try {
    const output = execSync(`find "${dir}" -name "${pattern}" -type f 2>/dev/null || true`, {
      encoding: 'utf8',
    }).trim();
    return output ? output.split('\n') : [];
  } catch {
    return [];
  }
}

/**
 * Find directories matching a pattern
 */
function findDirs(dir, pattern) {
  try {
    const output = execSync(`find "${dir}" -name "${pattern}" -type d 2>/dev/null || true`, {
      encoding: 'utf8',
    }).trim();
    return output ? output.split('\n') : [];
  } catch {
    return [];
  }
}

/**
 * Rename Android artifacts
 */
function renameAndroid() {
  console.log('📦 Renaming Android artifacts...');

  // Determine flavor based on build type
  let appFlavor;
  switch (buildType) {
    case 'main':
      appFlavor = 'prod';
      break;
    case 'flask':
      appFlavor = 'flask';
      break;
    case 'qa':
      appFlavor = 'qa';
      break;
    default:
      console.error(`❌ Unknown build type: ${buildType}`);
      process.exit(1);
  }

  // Determine if Debug or Release
  const buildConfig = configuration === 'Debug' ? 'debug' : 'release';

  // Set paths
  const apkDir = path.join(
    __dirname,
    `../android/app/build/outputs/apk/${appFlavor}/${buildConfig}`,
  );
  const bundleDir = path.join(
    __dirname,
    `../android/app/build/outputs/bundle/${appFlavor}Release`,
  );

  // Create new base name: metamask-{environment}-{buildType}-{version}-{buildNumber}
  const newBaseName = `metamask-${environment}-${buildType}-${appVersion}-${buildNumber}`;
  console.log(`📝 Renaming artifacts to: ${newBaseName}`);

  // Rename APK
  const oldApk = path.join(apkDir, `app-${appFlavor}-${buildConfig}.apk`);
  if (fs.existsSync(oldApk)) {
    const newApk = path.join(apkDir, `${newBaseName}.apk`);
    fs.copyFileSync(oldApk, newApk);
    console.log(`✅ Renamed APK: ${newApk}`);
  } else {
    console.log(`⚠️  APK not found: ${oldApk}`);
  }

  // Rename AAB (only for Release builds)
  if (buildConfig === 'release') {
    const oldAab = path.join(bundleDir, `app-${appFlavor}-release.aab`);
    if (fs.existsSync(oldAab)) {
      const newAab = path.join(bundleDir, `${newBaseName}.aab`);
      fs.copyFileSync(oldAab, newAab);
      console.log(`✅ Renamed AAB: ${newAab}`);
    } else {
      console.log(`⚠️  AAB not found: ${oldAab}`);
    }
  }

  // List final artifacts
  console.log('📦 Final artifacts:');
  const outputDir = path.join(__dirname, '../android/app/build/outputs');
  const apks = findFiles(outputDir, '*.apk');
  const aabs = findFiles(outputDir, '*.aab');
  [...apks, ...aabs].forEach((file) => {
    try {
      const stats = fs.statSync(file);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  ${file} (${sizeMB} MB)`);
    } catch {
      console.log(`  ${file}`);
    }
  });
}

/**
 * Rename iOS artifacts
 */
function renameIos() {
  console.log('📦 Renaming iOS artifacts...');

  const isSimBuild = process.env.IS_SIM_BUILD === 'true';

  // Determine app name based on build type
  let appName;
  switch (buildType) {
    case 'main':
      appName = 'MetaMask';
      break;
    case 'flask':
      appName = 'MetaMask-Flask';
      break;
    case 'qa':
      appName = 'MetaMask-QA';
      break;
    default:
      console.error(`❌ Unknown build type: ${buildType}`);
      process.exit(1);
  }

  // Determine build paths based on simulator vs device
  let buildDir, deviceType, binaryExtension;
  if (isSimBuild) {
    buildDir = path.join(
      __dirname,
      `../ios/build/Build/Products/${configuration || 'Release'}-iphonesimulator`,
    );
    deviceType = 'simulator';
    binaryExtension = '.app';
  } else {
    buildDir = path.join(__dirname, '../ios/build/output');
    deviceType = 'device';
    binaryExtension = '.ipa';
  }

  // Create new base name: metamask-{deviceType}-{environment}-{buildType}-{version}-{buildNumber}
  const newBaseName = `metamask-${deviceType}-${environment}-${buildType}-${appVersion}-${buildNumber}`;
  console.log(`📝 Renaming artifacts to: ${newBaseName}`);

  // Rename binary (.app or .ipa)
  const oldBinary = path.join(buildDir, `${appName}${binaryExtension}`);
  if (fs.existsSync(oldBinary)) {
    const newBinary = path.join(buildDir, `${newBaseName}${binaryExtension}`);
    // Use cp -r for directories (.app), regular copy for files (.ipa)
    if (binaryExtension === '.app') {
      execSync(`cp -r "${oldBinary}" "${newBinary}"`);
    } else {
      fs.copyFileSync(oldBinary, newBinary);
    }
    console.log(`✅ Renamed binary: ${newBinary}`);
  } else {
    console.log(`⚠️  Binary not found: ${oldBinary}`);
  }

  // Rename xcarchive (only for device builds)
  if (!isSimBuild) {
    const oldArchive = path.join(__dirname, `../ios/build/${appName}.xcarchive`);
    if (fs.existsSync(oldArchive)) {
      const newArchive = path.join(
        __dirname,
        `../ios/build/${newBaseName}.xcarchive`,
      );
      execSync(`cp -r "${oldArchive}" "${newArchive}"`);
      console.log(`✅ Renamed archive: ${newArchive}`);
    } else {
      console.log(`⚠️  Archive not found: ${oldArchive}`);
    }
  }

  // List final artifacts
  console.log('📦 Final artifacts:');
  if (isSimBuild) {
    const apps = findDirs(
      path.join(__dirname, '../ios/build/Build/Products'),
      '*.app',
    );
    apps.forEach((app) => {
      console.log(`  ${app}`);
    });
  } else {
    const ipas = findFiles(path.join(__dirname, '../ios/build/output'), '*.ipa');
    const archives = findDirs(path.join(__dirname, '../ios/build'), '*.xcarchive');
    [...ipas, ...archives].forEach((file) => {
      try {
        const stats = fs.statSync(file);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        console.log(`  ${file} (${sizeMB} MB)`);
      } catch {
        console.log(`  ${file}`);
      }
    });
  }
}

// Execute
if (platform === 'android') {
  renameAndroid();
} else if (platform === 'ios') {
  renameIos();
}

console.log('✅ Artifact renaming complete');
