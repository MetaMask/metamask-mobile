/* eslint-disable import-x/no-nodejs-modules */
/* eslint-disable import-x/no-commonjs */
// react-native.config.js

const fs = require('fs');
const path = require('path');

/**
 * React Native configuration for autolinking.
 */

// Check if Google Tap and Pay SDK is present for Android push provisioning
const tapAndPaySdkPath = path.join(
  __dirname,
  'android/libs/com/google/android/gms/play-services-tapandpay',
);
const hasTapAndPaySdk = fs.existsSync(tapAndPaySdkPath);

// Build dependencies config
const dependencies = {
  '@react-native-community/viewpager': {
    platforms: {
      ios: null, // react-native-pager-view is the modern replacement; both link identical Obj-C symbols
      android: null,
    },
  },
  'react-native-aes-crypto-forked': {
    platforms: {
      ios: null, // disable Android platform, other platforms will still autolink if provided
    },
  },
  // "Add to Google Wallet" library setup: Android enabled only when TapAndPay SDK present
  '@expensify/react-native-wallet': {
    platforms: {
      ...(hasTapAndPaySdk ? {} : { android: null }),
    },
  },
};

module.exports = {
  dependencies,
  // Note: Font assets now managed by expo-font plugin instead of React Native assets
};
