/**
 * Unit tests for scripts/repack.js
 *
 * Coverage targets from the testing plan:
 *  - getDeviceKeystoreConfig: exits in CI when any env var is missing; returns correct config when all are set.
 *  - Routing in main(): PLATFORM=ios + DEVICE_BUILD=true → repackIosDevice; PLATFORM=android + DEVICE_BUILD=true → repackAndroidDevice.
 *  - BUILD_NUMBER guard: repackIosDevice() throws when BUILD_NUMBER is not set.
 *
 * NOTE: All process.env accesses use bracket notation (e.g. process.env['VAR']) to
 * prevent Babel/React-Native from inlining env-var values at parse time (which would
 * turn `delete process.env.BUILD_NUMBER` into `delete undefined` in strict mode).
 */

// ─── Helpers ───────────────────────────────────────────────────────────────

function saveEnv() {
  return { ...process.env };
}

function restoreEnv(snapshot) {
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) Reflect.deleteProperty(process.env, key);
  }
  Object.assign(process.env, snapshot);
}

function setEnv(vars) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) {
      Reflect.deleteProperty(process.env, k);
    } else {
      process.env[k] = v;
    }
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('repack.js — BUILD_NUMBER guard (repackIosDevice)', () => {
  let envSnapshot;

  beforeEach(() => {
    envSnapshot = saveEnv();
    jest.resetModules();
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it('throws when BUILD_NUMBER is not set', async () => {
    setEnv({ BUILD_NUMBER: undefined });
    const { repackIosDevice } = require('./repack');
    await expect(repackIosDevice()).rejects.toThrow(
      'BUILD_NUMBER env var is required for iOS device repack.',
    );
  });

  it('proceeds past BUILD_NUMBER guard (fails at IPA dir check) when BUILD_NUMBER is set', async () => {
    // Use a bracket-notation assignment that survives Babel's potential inlining
    // (the transform-inline-environment-variables plugin is removed in test config,
    // but process.env['BUILD_NUMBER'] is the extra-safe bracket form).
    process.env.BUILD_NUMBER = '9999';
    const { repackIosDevice } = require('./repack');
    // The error changes: no longer a BUILD_NUMBER error, now a filesystem error
    await expect(repackIosDevice()).rejects.toThrow(/IPA directory not found/);
  });
});

/**
 * getDeviceKeystoreConfig is tested directly (it is exported for testability).
 * This avoids the need to stub fs and @expo/repack-app just to reach the function.
 */
describe('repack.js — getDeviceKeystoreConfig', () => {
  let envSnapshot;
  let exitSpy;

  beforeEach(() => {
    envSnapshot = saveEnv();
    jest.resetModules();
    // Mock process.exit so it doesn't actually terminate the test process
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    exitSpy.mockRestore();
    restoreEnv(envSnapshot);
  });

  it('calls process.exit(1) in CI when DEVICE_ANDROID_KEYSTORE_PATH is missing', () => {
    setEnv({
      CI: 'true',
      DEVICE_ANDROID_KEYSTORE_PATH: undefined,
      DEVICE_ANDROID_KEYSTORE_PASSWORD: 'secret',
      DEVICE_ANDROID_KEY_ALIAS: 'alias',
      DEVICE_ANDROID_KEY_PASSWORD: 'keypass',
    });
    const { getDeviceKeystoreConfig } = require('./repack');
    expect(() => getDeviceKeystoreConfig()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('calls process.exit(1) in CI when DEVICE_ANDROID_KEY_ALIAS is missing', () => {
    setEnv({
      CI: 'true',
      DEVICE_ANDROID_KEYSTORE_PATH: '/path/to/keystore',
      DEVICE_ANDROID_KEYSTORE_PASSWORD: 'secret',
      DEVICE_ANDROID_KEY_ALIAS: undefined,
      DEVICE_ANDROID_KEY_PASSWORD: 'keypass',
    });
    const { getDeviceKeystoreConfig } = require('./repack');
    expect(() => getDeviceKeystoreConfig()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('calls process.exit(1) in CI when DEVICE_ANDROID_KEYSTORE_PASSWORD is missing', () => {
    setEnv({
      CI: 'true',
      DEVICE_ANDROID_KEYSTORE_PATH: '/path/to/keystore',
      DEVICE_ANDROID_KEYSTORE_PASSWORD: undefined,
      DEVICE_ANDROID_KEY_ALIAS: 'alias',
      DEVICE_ANDROID_KEY_PASSWORD: 'keypass',
    });
    const { getDeviceKeystoreConfig } = require('./repack');
    expect(() => getDeviceKeystoreConfig()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('calls process.exit(1) in CI when DEVICE_ANDROID_KEY_PASSWORD is missing', () => {
    setEnv({
      CI: 'true',
      DEVICE_ANDROID_KEYSTORE_PATH: '/path/to/keystore',
      DEVICE_ANDROID_KEYSTORE_PASSWORD: 'secret',
      DEVICE_ANDROID_KEY_ALIAS: 'alias',
      DEVICE_ANDROID_KEY_PASSWORD: undefined,
    });
    const { getDeviceKeystoreConfig } = require('./repack');
    expect(() => getDeviceKeystoreConfig()).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does NOT call process.exit when not in CI, even if vars are missing', () => {
    setEnv({
      CI: undefined,
      DEVICE_ANDROID_KEYSTORE_PATH: undefined,
      DEVICE_ANDROID_KEYSTORE_PASSWORD: undefined,
      DEVICE_ANDROID_KEY_ALIAS: undefined,
      DEVICE_ANDROID_KEY_PASSWORD: undefined,
    });
    const { getDeviceKeystoreConfig } = require('./repack');
    const config = getDeviceKeystoreConfig();
    expect(exitSpy).not.toHaveBeenCalled();
    // Falls back to debug keystore defaults
    expect(config.keyStorePath).toBe('android/app/debug.keystore');
    expect(config.keyAlias).toBe('androiddebugkey');
    expect(config.keyStorePassword).toBe('pass:android');
  });

  it('prefixes passwords with "pass:" and returns correct config when all vars are set', () => {
    setEnv({
      CI: 'true',
      DEVICE_ANDROID_KEYSTORE_PATH: '/path/to/release.keystore',
      DEVICE_ANDROID_KEYSTORE_PASSWORD: 'ksPassword',
      DEVICE_ANDROID_KEY_ALIAS: 'releaseAlias',
      DEVICE_ANDROID_KEY_PASSWORD: 'keyPassword',
    });
    const { getDeviceKeystoreConfig } = require('./repack');
    const config = getDeviceKeystoreConfig();
    expect(config).toMatchObject({
      keyStorePath: '/path/to/release.keystore',
      keyStorePassword: 'pass:ksPassword',
      keyAlias: 'releaseAlias',
      keyPassword: 'pass:keyPassword',
    });
  });
});

/**
 * Routing tests use individual exported functions rather than main() because
 * main() catches all errors and calls process.exit(1), making it hard to
 * distinguish which route was taken from the outside. The distinctive error
 * messages thrown by each function are the routing signal.
 */
describe('repack.js — routing via exported functions', () => {
  let envSnapshot;

  beforeEach(() => {
    envSnapshot = saveEnv();
    jest.resetModules();
  });

  afterEach(() => {
    restoreEnv(envSnapshot);
  });

  it('repackIosDevice: BUILD_NUMBER guard fires before any filesystem access', async () => {
    setEnv({ BUILD_NUMBER: undefined, PLATFORM: 'ios', DEVICE_BUILD: 'true' });
    const { repackIosDevice } = require('./repack');
    await expect(repackIosDevice()).rejects.toThrow(
      'BUILD_NUMBER env var is required for iOS device repack.',
    );
  });

  it('repackIos (simulator): proceeds past BUILD_NUMBER to filesystem check', async () => {
    setEnv({ PLATFORM: 'ios', DEVICE_BUILD: undefined });
    const { repackIos } = require('./repack');
    // repackIos has no BUILD_NUMBER guard — throws on missing .app directory
    await expect(repackIos()).rejects.toThrow(/App not found/);
  });

  it('repackAndroidDevice: proceeds past BUILD_NUMBER to APK directory check', async () => {
    setEnv({ PLATFORM: 'android', DEVICE_BUILD: 'true' });
    const { repackAndroidDevice } = require('./repack');
    // Device path scans a directory — throws "APK directory not found"
    await expect(repackAndroidDevice()).rejects.toThrow(/APK directory not found/);
  });

  it('repackAndroid (E2E): uses a fixed APK path, throws "APK not found"', async () => {
    setEnv({ PLATFORM: 'android', DEVICE_BUILD: undefined });
    const { repackAndroid } = require('./repack');
    // E2E path uses a fixed hardcoded path — different error from device path
    await expect(repackAndroid()).rejects.toThrow(/APK not found/);
  });
});

describe('repack.js — main() exit-code behaviour', () => {
  let envSnapshot;
  let exitSpy;

  beforeEach(() => {
    envSnapshot = saveEnv();
    jest.resetModules();
    // main() catches all errors and calls process.exit(1); intercept so the
    // test process doesn't actually exit.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(jest.fn());
  });

  afterEach(() => {
    exitSpy.mockRestore();
    restoreEnv(envSnapshot);
  });

  it('calls process.exit(1) on invalid PLATFORM', async () => {
    setEnv({ PLATFORM: 'web', DEVICE_BUILD: undefined });
    const { main } = require('./repack');
    await main();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('calls process.exit(1) when PLATFORM is missing', async () => {
    setEnv({ PLATFORM: undefined, DEVICE_BUILD: undefined });
    const { main } = require('./repack');
    await main();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
