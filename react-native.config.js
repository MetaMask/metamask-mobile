/* eslint-disable import/no-commonjs */
// react-native.config.js

/**
 * React Native configuration for autolinking.
 *
 * NOTE: This is the base configuration. Platform-specific branches will modify this:
 * - feat/google-in-app-provisioning: Conditionally enables Android based on SDK presence
 * - feat/apple-in-app-provisioning: Enables iOS autolinking for react-native-wallet
 */

// Build dependencies config
const dependencies = {
  'react-native-aes-crypto-forked': {
    platforms: {
      ios: null, // disable Android platform, other platforms will still autolink if provided
    },
  },
  // Base branch disables wallet library on both platforms
  // Platform-specific branches will enable their respective platform
  '@expensify/react-native-wallet': {
    platforms: {
      android: null,
      ios: null,
    },
  },
};

module.exports = {
  dependencies,
  // Note: Font assets now managed by expo-font plugin instead of React Native assets
};
