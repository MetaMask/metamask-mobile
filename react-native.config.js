/* eslint-disable import/no-commonjs */
// react-native.config.js

/**
 * React Native configuration for autolinking.
 *
 * Apple Wallet provisioning is enabled on iOS.
 * Android is disabled in this branch.
 */

// Build dependencies config
const dependencies = {
  'react-native-aes-crypto-forked': {
    platforms: {
      ios: null, // disable Android platform, other platforms will still autolink if provided
    },
  },
  // Enable iOS for Apple Wallet provisioning, disable Android
  '@expensify/react-native-wallet': {
    platforms: {
      android: null,
    },
  },
};

module.exports = {
  dependencies,
  // Note: Font assets now managed by expo-font plugin instead of React Native assets
};
