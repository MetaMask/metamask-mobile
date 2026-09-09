import Device from '../util/device';

jest.mock('../util/device');

jest.mock('../util/test/utils', () => ({
  isE2EOrExpEnvironment: false,
  isRc: false,
}));

// Mirrors expo-screen-capture's real key handling: keys live in a Set, so
// `prevent` only hits native for a new key and `allow` only clears the native
// block once the Set is empty. The cross-owner behaviour under test is a
// property of this Set, so the mock reproduces it rather than stubbing it out.
const mockNativePreventScreenCapture = jest.fn();
const mockNativeAllowScreenCapture = jest.fn();

jest.mock('expo-screen-capture', () => {
  const activeTags = new Set();
  return {
    __activeTags: activeTags,
    preventScreenCaptureAsync: jest.fn(async (key = 'default') => {
      if (!activeTags.has(key)) {
        activeTags.add(key);
        mockNativePreventScreenCapture();
      }
    }),
    allowScreenCaptureAsync: jest.fn(async (key = 'default') => {
      activeTags.delete(key);
      if (activeTags.size === 0) {
        mockNativeAllowScreenCapture();
      }
    }),
  };
});

// isCaptureProtectionDisabled and isWholeWindowBlockSupported are computed once
// at module load, from env flags and Device.isAndroid() respectively, so each
// scenario needs a fresh module instance loaded after its mocks are set.
const loadPreventScreenshot = () => {
  let mod;
  jest.isolateModules(() => {
    mod = jest.requireActual('./PreventScreenshot');
  });
  return { PreventScreenshot: mod.default, CAPTURE_KEYS: mod.CAPTURE_KEYS };
};

describe('PreventScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    require('expo-screen-capture').__activeTags.clear();
  });

  describe('on Android', () => {
    beforeEach(() => {
      Device.isAndroid.mockReturnValue(true);
    });

    it('forbid applies the native block', async () => {
      const { PreventScreenshot, CAPTURE_KEYS } = loadPreventScreenshot();

      await PreventScreenshot.forbid(CAPTURE_KEYS.credentialScreens);

      expect(mockNativePreventScreenCapture).toHaveBeenCalledTimes(1);
    });

    it('allow releases the native block once its only owner releases', async () => {
      const { PreventScreenshot, CAPTURE_KEYS } = loadPreventScreenshot();

      await PreventScreenshot.forbid(CAPTURE_KEYS.credentialScreens);
      await PreventScreenshot.allow(CAPTURE_KEYS.credentialScreens);

      expect(mockNativeAllowScreenCapture).toHaveBeenCalledTimes(1);
    });

    it('keeps the block while another owner still holds it', async () => {
      const { PreventScreenshot, CAPTURE_KEYS } = loadPreventScreenshot();

      // Onboarding blocks for the whole flow, then a credential screen mounts
      // and releases partway through — onboarding must stay protected.
      await PreventScreenshot.forbid(CAPTURE_KEYS.onboarding);
      await PreventScreenshot.forbid(CAPTURE_KEYS.credentialScreens);
      await PreventScreenshot.allow(CAPTURE_KEYS.credentialScreens);

      expect(mockNativeAllowScreenCapture).not.toHaveBeenCalled();

      await PreventScreenshot.allow(CAPTURE_KEYS.onboarding);

      expect(mockNativeAllowScreenCapture).toHaveBeenCalledTimes(1);
    });

    it('does not let a keyless caller release another owner block', async () => {
      const { PreventScreenshot, CAPTURE_KEYS } = loadPreventScreenshot();

      // CardScreenshotDeterrent calls forbid()/allow() with no key. Its
      // release must not clear a block another screen is still relying on.
      await PreventScreenshot.forbid(CAPTURE_KEYS.credentialScreens);
      await PreventScreenshot.forbid();
      await PreventScreenshot.allow();

      expect(mockNativeAllowScreenCapture).not.toHaveBeenCalled();

      await PreventScreenshot.allow(CAPTURE_KEYS.credentialScreens);

      expect(mockNativeAllowScreenCapture).toHaveBeenCalledTimes(1);
    });

    it('gives every owner a distinct key', () => {
      const { CAPTURE_KEYS } = loadPreventScreenshot();
      const keys = Object.values(CAPTURE_KEYS);

      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('on iOS', () => {
    beforeEach(() => {
      Device.isAndroid.mockReturnValue(false);
    });

    it('forbid does not blank the window', async () => {
      const { PreventScreenshot, CAPTURE_KEYS } = loadPreventScreenshot();

      await PreventScreenshot.forbid(CAPTURE_KEYS.credentialScreens);

      expect(mockNativePreventScreenCapture).not.toHaveBeenCalled();
    });

    it('allow is a no-op', async () => {
      const { PreventScreenshot, CAPTURE_KEYS } = loadPreventScreenshot();

      await PreventScreenshot.allow(CAPTURE_KEYS.credentialScreens);

      expect(mockNativeAllowScreenCapture).not.toHaveBeenCalled();
    });
  });
});
