module.exports = {
  name: 'MetaMask',
  displayName: 'MetaMask',
  experiments: {
    reactCompiler: {
      enabled: true,
    },
  },
  plugins: [
    [
      'expo-build-properties',
      {
        android: {
          extraMavenRepos: [
            '../../node_modules/@notifee/react-native/android/libs',
          ],
        },
        ios: {},
      },
    ],
    [
      '@config-plugins/detox',
      {
        subdomains: '*',
      },
    ],

    'expo-apple-authentication',
  ],
  android: {
    package:
      process.env.METAMASK_BUILD_TYPE === 'flask'
        ? 'io.metamask.flask'
        : 'io.metamask', // Required for @expo/repack-app Android repacking
  },
  ios: {
    bundleIdentifier: 'io.metamask.MetaMask',
    usesAppleSignIn: true,
  },
  expo: {
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/f6be4653-8750-4688-8a44-c809d13b40ef',
      requestHeaders: {
        'expo-channel-name': 'preview',
      },
    },
    extra: {
      eas: {
        projectId: 'f6be4653-8750-4688-8a44-c809d13b40ef',
      },
    },
  },
};
