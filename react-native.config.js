/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
// react-native.config.js
// eslint-disable-next-line import/no-commonjs
const fs = require('fs');
const path = require('path');

// Check if Google Tap and Pay SDK is present for Android push provisioning
const tapAndPaySdkPath = path.join(
  __dirname,
  'android/libs/com/google/android/gms/play-services-tapandpay',
);
const hasTapAndPaySdk = fs.existsSync(tapAndPaySdkPath);

// Build dependencies config
const dependencies = {
  'react-native-aes-crypto-forked': {
    platforms: {
      ios: null, // disable Android platform, other platforms will still autolink if provided
    },
  },
};

// Only add wallet config to disable Android when SDK is not present
// When SDK is present, we don't add any config so default autolinking behavior applies
if (!hasTapAndPaySdk) {
  dependencies['@expensify/react-native-wallet'] = {
    platforms: {
      android: null, // disable Android when Tap and Pay SDK is not present
    },
  };
}

module.exports = {
  dependencies,
  // Note: Font assets now managed by expo-font plugin instead of React Native assets
};
