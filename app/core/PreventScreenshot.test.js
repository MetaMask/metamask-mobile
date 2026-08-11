import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
} from 'expo-screen-capture';
import Device from '../util/device';

jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  allowScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../util/device');

jest.mock('../util/test/utils', () => ({
  isE2EOrExpEnvironment: false,
  isRc: false,
}));

// isCaptureProtectionDisabled and isWholeWindowBlockSupported are computed
// once at module load, from env flags and Device.isAndroid() respectively, so
// each scenario needs a fresh module instance loaded after its mocks are set.
const loadPreventScreenshot = () => {
  let module;
  jest.isolateModules(() => {
    module = jest.requireActual('./PreventScreenshot').default;
  });
  return module;
};

describe('PreventScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on Android', () => {
    beforeEach(() => {
      Device.isAndroid.mockReturnValue(true);
    });

    it('forbid applies the FLAG_SECURE block', async () => {
      const PreventScreenshot = loadPreventScreenshot();

      await PreventScreenshot.forbid();

      expect(preventScreenCaptureAsync).toHaveBeenCalledWith(
        'metamask-credential-screens',
      );
    });

    it('allow releases the FLAG_SECURE block', async () => {
      const PreventScreenshot = loadPreventScreenshot();

      await PreventScreenshot.allow();

      expect(allowScreenCaptureAsync).toHaveBeenCalledWith(
        'metamask-credential-screens',
      );
    });
  });

  describe('on iOS', () => {
    beforeEach(() => {
      Device.isAndroid.mockReturnValue(false);
    });

    it('forbid does not blank the window', async () => {
      const PreventScreenshot = loadPreventScreenshot();

      await PreventScreenshot.forbid();

      expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
    });

    it('allow is a no-op', async () => {
      const PreventScreenshot = loadPreventScreenshot();

      await PreventScreenshot.allow();

      expect(allowScreenCaptureAsync).not.toHaveBeenCalled();
    });
  });
});
