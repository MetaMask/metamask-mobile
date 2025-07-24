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
        ios: {
          jsEngine: 'hermes',
        },
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
  ios: {
    usesAppleSignIn: true,
    jsEngine: 'hermes',
  },
  expo: {
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/f6be4653-8750-4688-8a44-c809d13b40ef',
      channel: 'preview',
      requestHeaders: {
        'expo-channel-name': 'preview',
      },
    },
    extra: {
      eas: {
        projectId: 'f6be4653-8750-4688-8a44-c809d13b40ef',
      },
    },
    android: {
      package: 'io.metamask',
    },
    ios: {
      bundleIdentifier: 'io.metamask.MetaMask',
    },
  },
};
