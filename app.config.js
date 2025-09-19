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
    package: 'io.metamask',
  },
  ios: {
    usesAppleSignIn: true,
  },
};
