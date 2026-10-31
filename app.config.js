const { RUNTIME_VERSION, PROJECT_ID, UPDATE_URL } = require('./ota.config.js');

// Use METAMASK_ENVIRONMENT to select OTA certs:
// - "production" and "rc" use their own certificates
// - all other environments (exp, dev, test, e2e, beta, etc.) fall back to "exp"
const OTA_ENV_MAP = {
  production: 'production',
  rc: 'rc',
};

const OTA_ENV = OTA_ENV_MAP[process.env.METAMASK_ENVIRONMENT] ?? 'exp';

const CODE_SIGNING_CERTS = {
  production: './certs/production.certificate.pem',
  exp: './certs/exp.certificate.pem',
  rc: './certs/rc.certificate.pem',
};

const CODE_SIGNING_KEYIDS = {
  production: 'production',
  exp: 'exp',
  rc: 'rc',
};

const APP_NAME = 'MetaMask';
const IS_FLASK = process.env.METAMASK_BUILD_TYPE === 'flask';
const IOS_BUNDLE_IDENTIFIER = IS_FLASK
  ? 'io.metamask.MetaMask-Flask'
  : 'io.metamask.MetaMask';
const ANDROID_PACKAGE = IS_FLASK ? 'io.metamask.flask' : 'io.metamask';

// While a root-level `expo` key exists, Expo tooling (@expo/config, @expo/repack-app,
// @expo/fingerprint) reads only that object and ignores its siblings. Root `name` is
// imported by index.js for AppRegistry.
module.exports = {
  name: APP_NAME,
  displayName: APP_NAME,
  // NOTE: React Compiler is enabled via the `react-compiler` babel plugin in
  // babel.config.js, not here. This repo uses the React Native community Metro
  // transformer, which doesn't pass the `supportsReactCompiler` caller flag that
  // Expo's `experiments.reactCompiler` relies on, so the flag would be a no-op.
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
    'expo-apple-authentication',
    [
      'expo-screen-orientation',
      {
        initialOrientation: 'PORTRAIT',
      },
    ],
    [
      'expo-font',
      {
        // NOTE: We use a simple path array for fonts. Each font file becomes a separate
        // font family based on its filename (e.g., Inter-Medium.ttf → 'Inter-Medium').
        // This means the fontWeight property won't automatically switch fonts - you must use
        // explicit font families like 'Inter-Medium' or use fontStyles.* from common.ts.
        //
        // Future: We may migrate to platform-specific configuration to enable native
        // fontWeight support. See: https://docs.expo.dev/develop/user-interface/fonts/
        fonts: [
          './app/fonts/Inter-Regular.ttf',
          './app/fonts/Inter-Medium.ttf',
          './app/fonts/Inter-SemiBold.ttf',
          './app/fonts/Inter-RegularItalic.ttf',
          './app/fonts/Inter-MediumItalic.ttf',
          './app/fonts/Inter-SemiBoldItalic.ttf',
          './app/fonts/GrotzecCond/GrotzecCond-Bold.otf',
        ],
      },
    ],
    'expo-asset',
    '@react-native-community/datetimepicker',
  ],
  android: {
    package: ANDROID_PACKAGE,
  },
  ios: {
    bundleIdentifier: IOS_BUNDLE_IDENTIFIER,
    usesAppleSignIn: true,
    jsEngine: 'hermes',
  },
  expo: {
    // Written by @expo/repack-app into CFBundleDisplayName and Android's app_name. When
    // missing, Expo falls back to the package.json name ("metamask").
    name: APP_NAME,
    owner: 'metamask',
    runtimeVersion: RUNTIME_VERSION,
    updates: {
      codeSigningCertificate: CODE_SIGNING_CERTS[OTA_ENV],
      codeSigningMetadata: {
        keyid: CODE_SIGNING_KEYIDS[OTA_ENV],
        alg: 'rsa-v1_5-sha256',
      },
      url: UPDATE_URL,
    },
    extra: {
      eas: {
        projectId: PROJECT_ID,
      },
    },
    // Required for @expo/repack-app, which writes these into the repacked app.
    android: {
      package: ANDROID_PACKAGE,
    },
    ios: {
      bundleIdentifier: IOS_BUNDLE_IDENTIFIER,
    },
  },
};
