#!/usr/bin/env node

/**
 * Updates expo updates enable flag in Android and iOS plists
 * based on the METAMASK_ENVIRONMENT environment variable.
 *
 * Usage: node scripts/update-expo-channel.js
 * Or set as a prebuild step in your build process
 */

const fs = require('fs');
const path = require('path');
const { RUNTIME_VERSION } = require('../ota.config.js');

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
 * Only toggles EXPO_UPDATES_CONFIGURATION_ENABLED in AndroidManifest.xml
 * @param {string} filePath
 * @param {boolean} updatesEnabled
 */
function updateAndroidManifest(filePath, channelName, runtimeVersion, updatesEnabled) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Update or insert EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE (channel)
  if (content.includes('expo.modules.updates.EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE')) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE" android:value="[^"]*" \/>/g,
      `<meta-data android:name="expo.modules.updates.EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE" android:value="${channelName}" />`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<!-- EAS Update configuration -->\n\t\t<meta-data android:name="expo.modules.updates.EXPO_UPDATES_CONFIGURATION_REQUEST_HEADERS_VALUE" android:value="${channelName}" />$1</application>`
    );
  }

  // Update or insert UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY (JSON header with channel)
  if (content.includes('expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY')) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="\{&quot;expo-channel-name&quot;:&quot;[^"]*&quot;\}"\/>/g,
      `<meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;${channelName}&quot;}"/>`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="{&quot;expo-channel-name&quot;:&quot;${channelName}&quot;}"/>$1</application>`
    );
  }

  // Update or insert EXPO_RUNTIME_VERSION
  if (content.includes('expo.modules.updates.EXPO_RUNTIME_VERSION')) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.EXPO_RUNTIME_VERSION" android:value="[^"]*" \/>/g,
      `<meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="${runtimeVersion}" />`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="${runtimeVersion}" />$1</application>`
    );
  }

  // Only toggle expo.modules.updates.ENABLED; rely on defaults for the rest
  const enabledValue = updatesEnabled ? 'true' : 'false';
  if (content.includes('expo.modules.updates.ENABLED')) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.ENABLED" android:value="(true|false)" \/>/g,
      `<meta-data android:name="expo.modules.updates.ENABLED" android:value="${enabledValue}" />`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="expo.modules.updates.ENABLED" android:value="${enabledValue}" />$1</application>`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ AndroidManifest.xml updated successfully');
}

/**
 * Only toggles EXUpdatesEnabled in plist file
 * @param {string} filePath
 * @param {string} fileName
 * @param {boolean} updatesEnabled
 */
function updatePlistFile(filePath, channelName, runtimeVersion, fileName, updatesEnabled) {
  console.log(`Updating ${fileName}: channel=${channelName}, runtime=${runtimeVersion}, EXUpdatesEnabled=${updatesEnabled}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Update or insert EXUpdatesChannel
  if (content.includes('<key>EXUpdatesChannel</key>')) {
    content = content.replace(
      /(<key>EXUpdatesChannel<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${channelName}$2`
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>EXUpdatesChannel</key>\n\t<string>${channelName}</string>$1</dict>\n</plist>`
    );
  }

  // Update or insert EXUpdatesRuntimeVersion
  if (content.includes('<key>EXUpdatesRuntimeVersion</key>')) {
    content = content.replace(
      /(<key>EXUpdatesRuntimeVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
      `$1${runtimeVersion}$2`
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>EXUpdatesRuntimeVersion</key>\n\t<string>${runtimeVersion}</string>$1</dict>\n</plist>`
    );
  }

  // Update or insert EXUpdatesRequestHeaders.expo-channel-name
  if (content.includes('<key>EXUpdatesRequestHeaders</key>')) {
    if (content.includes('<key>expo-channel-name</key>')) {
      content = content.replace(
        /(<key>expo-channel-name<\/key>\s*<string>)[^<]*(<\/string>)/,
        `$1${channelName}$2`
      );
    } else {
      content = content.replace(
        /(<key>EXUpdatesRequestHeaders<\/key>\s*<dict>)/,
        `$1\n\t\t<key>expo-channel-name</key>\n\t\t<string>${channelName}</string>`
      );
    }
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>EXUpdatesRequestHeaders</key>\n\t<dict>\n\t\t<key>expo-channel-name</key>\n\t\t<string>${channelName}</string>\n\t</dict>$1</dict>\n</plist>`
    );
  }

  // Only toggle EXUpdatesEnabled; do not modify CheckOnLaunch or LaunchWaitMs
  if (content.includes('<key>EXUpdatesEnabled</key>')) {
    content = content.replace(
      /<key>EXUpdatesEnabled<\/key>\s*<(true|false)\/>/,
      `<key>EXUpdatesEnabled</key>\n\t<${updatesEnabled ? 'true' : 'false'}/>`
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>EXUpdatesEnabled</key>\n\t<${updatesEnabled ? 'true' : 'false'}/>\n$1</dict>\n</plist>`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ ${fileName} updated successfully`);
}

/**
 * Main function
 */
function main() {
  const environment = process.env.METAMASK_ENVIRONMENT;

  console.log('======================================');
  console.log('  Updating Expo Updates Configuration');
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

  // Determine channel name (left here in case other tooling uses it downstream)
  const channelName = getChannelForEnvironment(environment);
  console.log(`Channel (unchanged): ${channelName}`);
  console.log('');

  // Determine updates enabled flag (production => false, others => true)
  const updatesEnabled = environment !== 'production';
  console.log(`Updates Enabled: ${updatesEnabled}`);

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
    updateAndroidManifest(ANDROID_MANIFEST_PATH, channelName, RUNTIME_VERSION, updatesEnabled);
    updatePlistFile(IOS_EXPO_PLIST_PATH, channelName, RUNTIME_VERSION, 'Expo.plist', updatesEnabled);
    updatePlistFile(IOS_INFO_PLIST_PATH, channelName, RUNTIME_VERSION, 'Info.plist', updatesEnabled);

    console.log('');
    console.log('✓ All files updated successfully!');
    console.log(`  Runtime Version: ${RUNTIME_VERSION}`);
    console.log(`  Channel (unchanged): ${channelName}`);
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

