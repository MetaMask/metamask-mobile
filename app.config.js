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
      url: 'https://u.expo.dev/fddf3e54-a014-4ba7-a695-d116a9ef9620',
      channel: 'preview',
      requestHeaders: {
        'expo-channel-name': 'preview',
      },
    },
    owner: 'metamask-test',
    extra: {
      eas: {
        projectId: 'fddf3e54-a014-4ba7-a695-d116a9ef9620',
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
