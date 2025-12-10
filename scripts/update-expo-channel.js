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
const { RUNTIME_VERSION, UPDATE_URL } = require('../ota.config.js');

const VALID_ENVIRONMENTS = ['beta', 'rc', 'exp', 'test', 'e2e', 'dev', 'production'];

const ANDROID_MANIFEST_PATH = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const IOS_EXPO_PLIST_PATH = path.join(__dirname, '..', 'ios', 'Expo.plist');

const CERTIFICATE_PATH = path.join(__dirname, '..', 'certs', 'certificate.pem');
const CODE_SIGNING_KEY_ID = 'main';
const CODE_SIGNING_ALGORITHM = 'rsa-v1_5-sha256';

//TODO: add production channel when it's ready
const CONFIG_MAP = {
  rc: {
    channel: 'preview',
    runtimeVersion: RUNTIME_VERSION,
    updatesEnabled: true,
    updateUrl: UPDATE_URL,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
  },
};

// Official Expo Updates configuration keys
// Reference: https://docs.expo.dev/versions/latest/sdk/updates/#configuration
const EXPO_CONFIG_MAP = {
  enabled: {
    ios: 'EXUpdatesEnabled',
    android: 'expo.modules.updates.ENABLED'
  },
  url: {
    ios: 'EXUpdatesURL',
    android: 'expo.modules.updates.EXPO_UPDATE_URL'
  },
  runtimeVersion: {
    ios: 'EXUpdatesRuntimeVersion',
    android: 'expo.modules.updates.EXPO_RUNTIME_VERSION'
  },
  requestHeaders: {
    ios: 'EXUpdatesRequestHeaders',
    android: 'expo.modules.updates.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY'
  },
  checkAutomatically: {
    ios: 'EXUpdatesCheckOnLaunch',
    android: 'expo.modules.updates.EXPO_UPDATES_CHECK_ON_LAUNCH'
  },
  codeSigningCertificate: {
    ios: 'EXUpdatesCodeSigningCertificate',
    android: 'expo.modules.updates.CODE_SIGNING_CERTIFICATE'
  },
  codeSigningMetadata: {
    ios: 'EXUpdatesCodeSigningMetadata',
    android: 'expo.modules.updates.CODE_SIGNING_METADATA'
  },
  fallbackToCacheTimeout: {
    ios: 'EXUpdatesLaunchWaitMs',
    android: 'expo.modules.updates.EXPO_UPDATES_LAUNCH_WAIT_MS'
  },
};

/**
 * Loads the code signing certificate and generates Expo-compatible payloads
 * for Android and iOS configuration files.
 *
 * @returns {null | {
 *   certificatePath: string,
 *   androidCertificateValue: string,
 *   iosCertificateValue: string,
 *   metadata: { keyid: string, alg: string },
 *   androidMetadataValue: string,
 * }} Configuration object or null when certificate is missing
 */
function loadCodeSigningConfiguration() {
  if (!fs.existsSync(CERTIFICATE_PATH)) {
    console.warn(
      `⚠️  Code signing certificate not found at ${CERTIFICATE_PATH}. ` +
        'Skipping code signing configuration updates.',
    );
    return null;
  }

  const certificateContent = fs.readFileSync(CERTIFICATE_PATH, 'utf8');

  const androidCertificateValue = certificateContent
    .replace(/\r/g, '&#xD;')
    .replace(/\n/g, '&#xA;');

  const iosCertificateValue = certificateContent.replace(/\r/g, '&#xD;');

  const metadata = {
    keyid: CODE_SIGNING_KEY_ID,
    alg: CODE_SIGNING_ALGORITHM,
  };

  const androidMetadataValue = JSON.stringify(metadata).replace(
    /"/g,
    '&quot;',
  );

  return {
    certificatePath: CERTIFICATE_PATH,
    androidCertificateValue,
    iosCertificateValue,
    metadata,
    androidMetadataValue,
  };
}

/**
 * Gets the configuration for a given environment
 * @returns {Object} - The configuration object with channel, runtimeVersion, and updatesEnabled
 */
function getConfigForEnvironment() {
  // For now, all environments use RC configuration
  return CONFIG_MAP.rc;
}

/**
 * Only toggles EXPO_UPDATES_CONFIGURATION_ENABLED in AndroidManifest.xml
 * @param {string} filePath
 * @param {string} channelName
 * @param {string} runtimeVersion
 * @param {boolean} updatesEnabled
 * @param {string} updateUrl
 * @param {string} checkAutomatically
 * @param {number} fallbackToCacheTimeout
 */
function updateAndroidManifest(
  filePath,
  channelName,
  runtimeVersion,
  updatesEnabled,
  updateUrl,
  checkAutomatically,
  fallbackToCacheTimeout,
  codeSigningConfig,
) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Update or insert UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY (JSON header with channel)
  const requestHeadersKey = EXPO_CONFIG_MAP.requestHeaders.android;
  if (content.includes(requestHeadersKey)) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.UPDATES_CONFIGURATION_REQUEST_HEADERS_KEY" android:value="\{&quot;expo-channel-name&quot;:&quot;[^"]*&quot;\}"\/>/g,
      `<meta-data android:name="${requestHeadersKey}" android:value="{&quot;expo-channel-name&quot;:&quot;${channelName}&quot;}"/>`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<!-- EAS Update configuration -->\n\t\t<meta-data android:name="${requestHeadersKey}" android:value="{&quot;expo-channel-name&quot;:&quot;${channelName}&quot;}"/>$1</application>`
    );
  }

  // Update or insert EXPO_RUNTIME_VERSION
  const runtimeVersionKey = EXPO_CONFIG_MAP.runtimeVersion.android;
  if (content.includes(runtimeVersionKey)) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.EXPO_RUNTIME_VERSION" android:value="[^"]*" \/>/g,
      `<meta-data android:name="${runtimeVersionKey}" android:value="${runtimeVersion}" />`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="${runtimeVersionKey}" android:value="${runtimeVersion}" />$1</application>`
    );
  }

  // Update or insert EXPO_UPDATE_URL
  const updateUrlKey = EXPO_CONFIG_MAP.url.android;
  if (content.includes(updateUrlKey)) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.EXPO_UPDATE_URL" android:value="[^"]*" \/>/g,
      `<meta-data android:name="${updateUrlKey}" android:value="${updateUrl}" />`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="${updateUrlKey}" android:value="${updateUrl}" />$1</application>`
    );
  }

  // Update or insert EXPO_UPDATES_CHECK_ON_LAUNCH
  const checkAutomaticallyKey = EXPO_CONFIG_MAP.checkAutomatically.android;
  if (content.includes(checkAutomaticallyKey)) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.EXPO_UPDATES_CHECK_ON_LAUNCH" android:value="[^"]*" \/>/g,
      `<meta-data android:name="${checkAutomaticallyKey}" android:value="${checkAutomatically}" />`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="${checkAutomaticallyKey}" android:value="${checkAutomatically}" />$1</application>`
    );
  }

  // Update or insert EXPO_UPDATES_LAUNCH_WAIT_MS (fallbackToCacheTimeout)
  const fallbackToCacheTimeoutKey = EXPO_CONFIG_MAP.fallbackToCacheTimeout.android;
  if (content.includes(fallbackToCacheTimeoutKey)) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.EXPO_UPDATES_LAUNCH_WAIT_MS" android:value="[^"]*" \/>/g,
      `<meta-data android:name="${fallbackToCacheTimeoutKey}" android:value="${fallbackToCacheTimeout}" />`,
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="${fallbackToCacheTimeoutKey}" android:value="${fallbackToCacheTimeout}" />$1</application>`,
    );
  }

  if (codeSigningConfig?.androidCertificateValue) {
    const certificateKey = EXPO_CONFIG_MAP.codeSigningCertificate.android;
    const certificateMetaData = `<meta-data android:name="${certificateKey}" android:value="${codeSigningConfig.androidCertificateValue}" />`;

    if (content.includes(certificateKey)) {
      content = content.replace(
        /<meta-data android:name="expo\.modules\.updates\.CODE_SIGNING_CERTIFICATE" android:value="[^"]*" \/>/g,
        certificateMetaData,
      );
    } else {
      content = content.replace(
        /(\s*)<\/application>/,
        `\n\t\t${certificateMetaData}$1</application>`,
      );
    }
  }

  if (codeSigningConfig?.androidMetadataValue) {
    const metadataKey = EXPO_CONFIG_MAP.codeSigningMetadata.android;
    const metadataMetaData = `<meta-data android:name="${metadataKey}" android:value="${codeSigningConfig.androidMetadataValue}" />`;

    if (content.includes(metadataKey)) {
      content = content.replace(
        /<meta-data android:name="expo\.modules\.updates\.CODE_SIGNING_METADATA" android:value="[^"]*" \/>/g,
        metadataMetaData,
      );
    } else {
      content = content.replace(
        /(\s*)<\/application>/,
        `\n\t\t${metadataMetaData}$1</application>`,
      );
    }
  }

  // Only toggle expo.modules.updates.ENABLED; rely on defaults for the rest
  const enabledKey = EXPO_CONFIG_MAP.enabled.android;
  const enabledValue = updatesEnabled ? 'true' : 'false';
  if (content.includes(enabledKey)) {
    content = content.replace(
      /<meta-data android:name="expo\.modules\.updates\.ENABLED" android:value="(true|false)" \/>/g,
      `<meta-data android:name="${enabledKey}" android:value="${enabledValue}" />`
    );
  } else {
    content = content.replace(
      /(\s*)<\/application>/,
      `\n\t\t<meta-data android:name="${enabledKey}" android:value="${enabledValue}" />$1</application>`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ AndroidManifest.xml updated successfully');
}

/**
 * Only toggles EXUpdatesEnabled in plist file
 * @param {string} filePath
 * @param {string} channelName
 * @param {string} runtimeVersion
 * @param {string} fileName
 * @param {boolean} updatesEnabled
 * @param {string} updateUrl
 * @param {string} checkAutomatically
 * @param {number} fallbackToCacheTimeout
 */
function updatePlistFile(
  filePath,
  channelName,
  runtimeVersion,
  fileName,
  updatesEnabled,
  updateUrl,
  checkAutomatically,
  fallbackToCacheTimeout,
  codeSigningConfig,
) {
  console.log(`Updating ${fileName}: channel=${channelName}, runtime=${runtimeVersion}, EXUpdatesEnabled=${updatesEnabled}, updateUrl=${updateUrl}, checkAutomatically=${checkAutomatically}`);

  let content = fs.readFileSync(filePath, 'utf8');

  // Update or insert EXUpdatesRuntimeVersion
  const runtimeVersionKey = EXPO_CONFIG_MAP.runtimeVersion.ios;
  if (content.includes(`<key>${runtimeVersionKey}</key>`)) {
    content = content.replace(
      new RegExp(`(<key>${runtimeVersionKey}<\\/key>\\s*<string>)[^<]*(<\\/string>)`),
      `$1${runtimeVersion}$2`
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>${runtimeVersionKey}</key>\n\t<string>${runtimeVersion}</string>$1</dict>\n</plist>`
    );
  }

  // Update or insert EXUpdatesURL
  const updateUrlKey = EXPO_CONFIG_MAP.url.ios;
  if (content.includes(`<key>${updateUrlKey}</key>`)) {
    content = content.replace(
      new RegExp(`(<key>${updateUrlKey}<\\/key>\\s*<string>)[^<]*(<\\/string>)`),
      `$1${updateUrl}$2`
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>${updateUrlKey}</key>\n\t<string>${updateUrl}</string>$1</dict>\n</plist>`
    );
  }

  // Update or insert EXUpdatesRequestHeaders.expo-channel-name
  const requestHeadersKey = EXPO_CONFIG_MAP.requestHeaders.ios;
  if (content.includes(`<key>${requestHeadersKey}</key>`)) {
    if (content.includes('<key>expo-channel-name</key>')) {
      content = content.replace(
        /(<key>expo-channel-name<\/key>\s*<string>)[^<]*(<\/string>)/,
        `$1${channelName}$2`
      );
    } else {
      content = content.replace(
        new RegExp(`(<key>${requestHeadersKey}<\\/key>\\s*<dict>)`),
        `$1\n\t\t<key>expo-channel-name</key>\n\t\t<string>${channelName}</string>`
      );
    }
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>${requestHeadersKey}</key>\n\t<dict>\n\t\t<key>expo-channel-name</key>\n\t\t<string>${channelName}</string>\n\t</dict>$1</dict>\n</plist>`
    );
  }

  // Update or insert EXUpdatesCheckOnLaunch
  const checkAutomaticallyKey = EXPO_CONFIG_MAP.checkAutomatically.ios;
  if (content.includes(`<key>${checkAutomaticallyKey}</key>`)) {
    content = content.replace(
      new RegExp(`(<key>${checkAutomaticallyKey}<\\/key>\\s*<string>)[^<]*(<\\/string>)`),
      `$1${checkAutomatically}$2`
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>${checkAutomaticallyKey}</key>\n\t<string>${checkAutomatically}</string>$1</dict>\n</plist>`
    );
  }

  // Update or insert EXUpdatesLaunchWaitMs (fallbackToCacheTimeout)
  const fallbackToCacheTimeoutKey = EXPO_CONFIG_MAP.fallbackToCacheTimeout.ios;
  if (content.includes(`<key>${fallbackToCacheTimeoutKey}</key>`)) {
    content = content.replace(
      new RegExp(
        `(<key>${fallbackToCacheTimeoutKey}<\\/key>\\s*<integer>)[^<]*(<\\/integer>)`,
      ),
      `$1${fallbackToCacheTimeout}$2`,
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>${fallbackToCacheTimeoutKey}</key>\n\t<integer>${fallbackToCacheTimeout}</integer>$1</dict>\n</plist>`,
    );
  }

  if (codeSigningConfig?.iosCertificateValue) {
    const certificateKey = EXPO_CONFIG_MAP.codeSigningCertificate.ios;
    const certificateBlock = `<key>${certificateKey}</key>\n\t<string>${codeSigningConfig.iosCertificateValue}</string>`;

    if (content.includes(`<key>${certificateKey}</key>`)) {
      content = content.replace(
        new RegExp(
          `(<key>${certificateKey}<\\/key>\\s*<string>)[\\s\\S]*?(<\\/string>)`,
        ),
        `$1${codeSigningConfig.iosCertificateValue}$2`,
      );
    } else {
      content = content.replace(
        /(\s*)<\/dict>\s*<\/plist>/,
        `\n\t${certificateBlock}\n$1</dict>\n</plist>`,
      );
    }
  }

  if (codeSigningConfig?.metadata) {
    const metadataKey = EXPO_CONFIG_MAP.codeSigningMetadata.ios;
    const metadataBlock = `\t<key>${metadataKey}</key>\n\t<dict>\n\t\t<key>keyid</key>\n\t\t<string>${codeSigningConfig.metadata.keyid}</string>\n\t\t<key>alg</key>\n\t\t<string>${codeSigningConfig.metadata.alg}</string>\n\t</dict>`;

    if (content.includes(`<key>${metadataKey}</key>`)) {
      content = content.replace(
        new RegExp(
          `<key>${metadataKey}<\\/key>\\s*<dict>[\\s\\S]*?<\\/dict>`,
        ),
        metadataBlock,
      );
    } else {
      content = content.replace(
        /(\s*)<\/dict>\s*<\/plist>/,
        `\n${metadataBlock}\n$1</dict>\n</plist>`,
      );
    }
  }

  // Only toggle EXUpdatesEnabled; LaunchWaitMs is handled via fallbackToCacheTimeout
  const enabledKey = EXPO_CONFIG_MAP.enabled.ios;
  if (content.includes(`<key>${enabledKey}</key>`)) {
    content = content.replace(
      new RegExp(`<key>${enabledKey}<\\/key>\\s*<(true|false)\\/>`),
      `<key>${enabledKey}</key>\n\t<${updatesEnabled ? 'true' : 'false'}/>`
    );
  } else {
    content = content.replace(
      /(\s*)<\/dict>\s*<\/plist>/,
      `\n\t<key>${enabledKey}</key>\n\t<${updatesEnabled ? 'true' : 'false'}/>\n$1</dict>\n</plist>`
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
  const codeSigningConfig = loadCodeSigningConfiguration();

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

  // Skip configuration for production environment
  if (environment === 'production' || environment === 'dev' || environment === 'e2e') {
    console.log('ℹ️  Production/dev/e2e environment detected - skipping Expo Updates configuration');
    console.log('✓ No configuration changes made');
    return;
  }

  // Get configuration for this environment
  const {
    channel,
    runtimeVersion,
    updatesEnabled,
    updateUrl,
    checkAutomatically,
    fallbackToCacheTimeout,
  } = getConfigForEnvironment(environment);

  // Check if files exist
  if (!fs.existsSync(ANDROID_MANIFEST_PATH)) {
    console.error(`❌ Error: AndroidManifest.xml not found at ${ANDROID_MANIFEST_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(IOS_EXPO_PLIST_PATH)) {
    console.error(`❌ Error: Expo.plist not found at ${IOS_EXPO_PLIST_PATH}`);
    process.exit(1);
  }


  try {
    updateAndroidManifest(
      ANDROID_MANIFEST_PATH,
      channel,
      runtimeVersion,
      updatesEnabled,
      updateUrl,
      checkAutomatically,
      fallbackToCacheTimeout,
      codeSigningConfig,
    );
    updatePlistFile(
      IOS_EXPO_PLIST_PATH,
      channel,
      runtimeVersion,
      'Expo.plist',
      updatesEnabled,
      updateUrl,
      checkAutomatically,
      fallbackToCacheTimeout,
      codeSigningConfig,
    );

    console.log('✓ All files updated successfully!');
  } catch (error) {
    console.error('❌ Error updating files:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getConfigForEnvironment,
  updateAndroidManifest,
  updatePlistFile,
  CONFIG_MAP,
};
