// react-native.config.js
// eslint-disable-next-line import/no-commonjs
module.exports = {
  dependencies: {
    'react-native-aes-crypto-forked': {
      platforms: {
        ios: null, // disable Android platform, other platforms will still autolink if provided
      },
    },
    'react-native-gesture-handler': {
      platforms: {
        android: {
          sourceDir: './node_modules/react-native-gesture-handler/android',
        },
      },
    },
    'react-native-video': {
      platforms: {
        android: {
          sourceDir: './node-modules/react-native-video/android-exoplayer',
        },
      },
    },
  },
  assets: ['./app/fonts/'],
};
