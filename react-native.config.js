/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
// react-native.config.js

const fs = require('fs');
const path = require('path');

/**
 * React Native configuration for autolinking.
 *
 * Google Wallet provisioning is enabled on Android when the TapAndPay SDK is present.
 * iOS is disabled in this branch.
 */

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
  // Google Wallet branch: iOS always disabled, Android enabled only when SDK present
  '@expensify/react-native-wallet': {
    platforms: {
      ios: null,
      ...(hasTapAndPaySdk ? {} : { android: null }),
    },
  },
};

module.exports = {
  dependencies,
  // Note: Font assets now managed by expo-font plugin instead of React Native assets
};
