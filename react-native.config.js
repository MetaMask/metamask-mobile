// react-native.config.js
// eslint-disable-next-line import/no-commonjs
module.exports = {
  dependencies: {
    'react-native-aes-crypto-forked': {
      platforms: {
        ios: null, // disable Android platform, other platforms will still autolink if provided
      },
    },
  },
  // Note: Font assets now managed by expo-font plugin instead of React Native assets
};
