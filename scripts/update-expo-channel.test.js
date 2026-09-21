const {
  getRuntimeVersion,
  setAndroidRuntimeVersion,
  setIosRuntimeVersion,
} = require('./update-expo-channel');
const { RUNTIME_VERSION } = require('../ota.config');

describe('development runtime fingerprint', () => {
  it('uses the native fingerprint as the development runtime version', () => {
    const fingerprint = 'native-fingerprint';

    const runtimeVersion = getRuntimeVersion('dev', fingerprint);

    expect(runtimeVersion).toBe(fingerprint);
  });

  it('requires a native fingerprint for the development runtime version', () => {
    const resolveRuntimeVersion = () => getRuntimeVersion('dev', '');

    expect(resolveRuntimeVersion).toThrow(
      'METAMASK_NATIVE_FINGERPRINT is required for development builds',
    );
  });

  it('keeps the release runtime version outside development', () => {
    const runtimeVersion = getRuntimeVersion('production', 'native-fingerprint');

    expect(runtimeVersion).toBe(RUNTIME_VERSION);
  });

  it('replaces the Android runtime version', () => {
    const manifest =
      '<application><meta-data android:name="expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="old" /></application>';

    const updatedManifest = setAndroidRuntimeVersion(
      manifest,
      'native-fingerprint',
    );

    expect(updatedManifest).toContain('android:value="native-fingerprint"');
  });

  it('replaces the iOS runtime version', () => {
    const plist =
      '<dict><key>EXUpdatesRuntimeVersion</key><string>old</string></dict>';

    const updatedPlist = setIosRuntimeVersion(plist, 'native-fingerprint');

    expect(updatedPlist).toContain('<string>native-fingerprint</string>');
  });
});
