#!/usr/bin/env node

/**
 * Updates expo-channel-name in both AndroidManifest.xml and Expo.plist
 * based on the METAMASK_ENVIRONMENT environment variable.
 *
 * Usage: node scripts/update-expo-channel.js
 * Or set as a prebuild step in your build process
 */

const fs = require('fs');
const path = require('path');

// Valid environment values
const VALID_ENVIRONMENTS = ['production', 'beta', 'rc', 'exp', 'test', 'e2e', 'dev'];

// File paths
const ANDROID_MANIFEST_PATH = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const IOS_EXPO_PLIST_PATH = path.join(__dirname, '..', 'ios', 'Expo.plist');
const IOS_INFO_PLIST_PATH = path.join(__dirname, '..', 'ios', 'MetaMask', 'Info.plist');

/**
 * Determines the channel name based on the environment
 * @param {string} environment - The METAMASK_ENVIRONMENT value
 * @returns {string} - The channel name ('production' or 'preview')
 */
function getChannelForEnvironment(environment) {
  // Production environment uses 'production' channel, all others use 'preview'
  return environment === 'production' ? 'production' : 'preview';
}

/**
 * Updates the expo-channel-name in AndroidManifest.xml
 * @param {string} filePath - Path to AndroidManifest.xml
 * @param {string} channelName - The channel name to set
 */
function updateAndroidManifest(filePath, channelName) {
  console.log(`Updating AndroidManifest.xml to channel: ${channelName}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Update the EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE meta-data
  content = content.replace(
    /<meta-data android:name="expo\.modules\.updates\.EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE" android:value="[^"]*" \/>/g,
    `<meta-data android:name="expo.modules.updates.EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE" android:value="${channelName}" />`
  );

  // Update the UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY meta-data (JSON format)
  content = content.replace(
    /<meta-data android:name="expo\.modules\.updates\.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="\{&quot;expo-channel-name&quot;:&quot;[^"]*&quot;\}"\/>/g,
    `<meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;${channelName}&quot;}"/>`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ AndroidManifest.xml updated successfully');
}

/**
 * Updates the expo-channel-name in a plist file
 * @param {string} filePath - Path to plist file
 * @param {string} channelName - The channel name to set
 * @param {string} fileName - Display name for logging
 */
function updatePlistFile(filePath, channelName, fileName) {
  console.log(`Updating ${fileName} to channel: ${channelName}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Update EXUpdatesChannel value
  content = content.replace(
    /(<key>EXUpdatesChannel<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${channelName}$2`
  );

  // Update expo-channel-name in EXUpdatesRequestHeaders
  content = content.replace(
    /(<key>expo-channel-name<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${channelName}$2`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ ${fileName} updated successfully`);
}

/**
 * Main function
 */
function main() {
  const environment = process.env.METAMASK_ENVIRONMENT;

  console.log('======================================');
  console.log('  Updating Expo Channel Configuration');
  console.log('======================================');
  console.log('');

  // Validate environment variable
  if (!environment) {
    console.error('❌ Error: METAMASK_ENVIRONMENT is not set');
    console.error('   Please set it to one of:', VALID_ENVIRONMENTS.join(', '));
    process.exit(1);
  }

  if (!VALID_ENVIRONMENTS.includes(environment)) {
    console.error(`❌ Error: Invalid METAMASK_ENVIRONMENT: ${environment}`);
    console.error('   Valid values:', VALID_ENVIRONMENTS.join(', '));
    process.exit(1);
  }

  console.log(`Environment: ${environment}`);

  // Determine channel name
  const channelName = getChannelForEnvironment(environment);
  console.log(`Channel: ${channelName}`);
  console.log('');

  // Check if files exist
  if (!fs.existsSync(ANDROID_MANIFEST_PATH)) {
    console.error(`❌ Error: AndroidManifest.xml not found at ${ANDROID_MANIFEST_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(IOS_EXPO_PLIST_PATH)) {
    console.error(`❌ Error: Expo.plist not found at ${IOS_EXPO_PLIST_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(IOS_INFO_PLIST_PATH)) {
    console.error(`❌ Error: Info.plist not found at ${IOS_INFO_PLIST_PATH}`);
    process.exit(1);
  }

  // Update files
  try {
    updateAndroidManifest(ANDROID_MANIFEST_PATH, channelName);
    updatePlistFile(IOS_EXPO_PLIST_PATH, channelName, 'Expo.plist');
    updatePlistFile(IOS_INFO_PLIST_PATH, channelName, 'Info.plist');

    console.log('');
    console.log('✓ All files updated successfully!');
    console.log('');
  } catch (error) {
    console.error('❌ Error updating files:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  getChannelForEnvironment,
  updateAndroidManifest,
  updatePlistFile,
};

