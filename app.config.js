const { RUNTIME_VERSION, PROJECT_ID, UPDATE_URL } = require('./ota.config.js');

// Use METAMASK_ENVIRONMENT to select OTA certs:
// - "production" and "rc" use their own certificates
// - all other environments (exp, dev, test, e2e, beta, etc.) fall back to "exp"
const OTA_ENV_MAP = {
  production: 'production',
  rc: 'rc',
};

const OTA_ENV = OTA_ENV_MAP[process.env.METAMASK_ENVIRONMENT] ?? 'exp';

// Disable OTA updates for E2E builds. We only ship OTA updates to real users
// on production/RC builds; flipping this off for E2E lets the native runtime
// skip reading `app.manifest` entirely (see expo-updates'
// `EmbeddedManifestUtils`), which in turn lets `scripts/repack.js` replace
// the redundant Metro-backed manifest generation with a cheap stub and cut
// ~2m off every repack.
const IS_E2E_BUILD =
  process.env.IS_TEST === 'true' || process.env.METAMASK_ENVIRONMENT === 'e2e';

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
        // font family based on its filename (e.g., Geist-Medium.otf → 'Geist-Medium').
        // This means the fontWeight property won't automatically switch fonts - you must use
        // explicit font families like 'Geist-Medium' or use fontStyles.* from common.ts.
        //
        // Future: We may migrate to platform-specific configuration to enable native
        // fontWeight support. See: https://docs.expo.dev/develop/user-interface/fonts/
        fonts: [
          './app/fonts/Geist-Regular.otf',
          './app/fonts/Geist-Medium.otf',
          './app/fonts/Geist-SemiBold.otf',
          './app/fonts/Geist-RegularItalic.otf',
          './app/fonts/Geist-MediumItalic.otf',
          './app/fonts/Geist-SemiBoldItalic.otf',
          './app/fonts/MMSans-Regular.otf',
          './app/fonts/MMSans-Medium.otf',
          './app/fonts/MMSans-Bold.otf',
          './app/fonts/MMPoly-Regular.otf',
        ],
      },
    ],
  ],
  android: {
    package:
      process.env.METAMASK_BUILD_TYPE === 'flask'
        ? 'io.metamask.flask'
        : 'io.metamask', // Required for @expo/repack-app Android repacking
  },
  ios: {
    bundleIdentifier:
      process.env.METAMASK_BUILD_TYPE === 'flask'
        ? 'io.metamask.MetaMask-Flask'
        : 'io.metamask.MetaMask', // Required for @expo/repack-app iOS repacking
    usesAppleSignIn: true,
    jsEngine: 'hermes',
  },
  expo: {
    owner: 'metamask',
    runtimeVersion: RUNTIME_VERSION,
    updates: {
      ...(IS_E2E_BUILD ? { enabled: false } : {}),
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
    android: {
      package: 'io.metamask',
    },
    ios: {
      bundleIdentifier: 'io.metamask.MetaMask',
    },
  },
};
