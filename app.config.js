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
    [
      '@intercom/intercom-react-native',
      {
        androidApiKey: 'KEY_HERE',
        iosApiKey: 'KEY_HERE'
      }
    ],
    'expo-apple-authentication',
  ],
  ios: {
    usesAppleSignIn: true,
  },
};
