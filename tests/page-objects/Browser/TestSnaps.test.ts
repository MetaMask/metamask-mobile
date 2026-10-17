jest.mock('../../framework/Assertions', () => ({
  __esModule: true,
  default: {
    expectElementToBeVisible: jest.fn(),
  },
}));

jest.mock('../../framework/Gestures', () => ({
  __esModule: true,
  default: {
    tap: jest.fn(),
    typeText: jest.fn(),
    waitAndTap: jest.fn(),
  },
}));

jest.mock('../../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn(),
    getElementByText: jest.fn(),
    scrollContainer: jest.fn(),
  },
}));

jest.mock('../../framework/Utilities', () => ({
  __esModule: true,
  default: {
    executeWithRetry: jest.fn(
      async (operation: () => Promise<unknown>): Promise<unknown> => {
        let lastError: unknown;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            return await operation();
          } catch (error) {
            lastError = error;
          }
        }
        throw lastError;
      },
    ),
    isElementVisible: jest.fn(),
  },
  sleep: jest.fn(),
}));

jest.mock('../../framework/WebView', () => ({
  __esModule: true,
  default: {
    tapById: jest.fn(),
    selectOptionById: jest.fn(),
  },
}));

jest.mock('../../framework/PlatformLocator', () => ({
  PlatformDetector: {
    isAndroid: jest.fn(() => false),
    isIOSAppium: jest.fn(() => true),
  },
}));

jest.mock('../../framework/DeviceInfoCache', () => ({
  getWindowSize: jest.fn(() => ({ width: 390, height: 844 })),
}));

jest.mock('../../framework/AppiumUtilities', () => ({
  getDriver: jest.fn(),
}));

jest.mock('../../framework', () => ({
  resolve: jest.fn(),
}));

jest.mock('../../flows/browser.flow', () => ({
  waitForTestSnapsToLoad: jest.fn(),
}));

jest.mock('./BrowserView', () => ({
  __esModule: true,
  default: {
    navigateToURL: jest.fn(),
    tapReloadButton: jest.fn(),
  },
}));

jest.mock('../wallet/ToastModal', () => ({
  __esModule: true,
  default: {},
}));

import { waitForTestSnapsToLoad } from '../../flows/browser.flow';
import Matchers from '../../framework/Matchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import Utilities from '../../framework/Utilities';
import Browser from './BrowserView';
import TestSnaps, { TEST_SNAPS_URL } from './TestSnaps';

const alertElement = { id: 'enabled-snap-alert' };

const baseRetryOptions = {
  timeout: 60_000,
  interval: 500,
  maxRetries: 8,
  elemDescription: 'Send Alert button / enabled Snap alert dialog',
  description: 'Send enabled Snap alert until dialog is visible',
};

describe('TestSnaps.navigateToTestSnap', () => {
  beforeEach(() => {
    jest.mocked(Browser.navigateToURL).mockResolvedValue(undefined);
    jest.mocked(PlatformDetector.isIOSAppium).mockReturnValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not close tabs on iOS', async () => {
    await TestSnaps.navigateToTestSnap();

    expect(Browser.navigateToURL).toHaveBeenCalledWith(TEST_SNAPS_URL, {
      closeAllTabsIfOpen: false,
    });
  });

  it('closes tabs on Android before opening test-snaps', async () => {
    jest.mocked(PlatformDetector.isIOSAppium).mockReturnValue(false);

    await TestSnaps.navigateToTestSnap();

    expect(Browser.navigateToURL).toHaveBeenCalledWith(TEST_SNAPS_URL, {
      closeAllTabsIfOpen: true,
    });
  });

  it('leaves Android tabs open when skipTabCleanup is set', async () => {
    jest.mocked(PlatformDetector.isIOSAppium).mockReturnValue(false);

    await TestSnaps.navigateToTestSnap({ skipTabCleanup: true });

    expect(Browser.navigateToURL).toHaveBeenCalledWith(TEST_SNAPS_URL, {
      closeAllTabsIfOpen: false,
    });
  });
});

describe('TestSnaps.tapSendAlertAndExpectEnabled', () => {
  let tapButton: jest.SpyInstance;
  let expectEnabledSnapAlert: jest.SpyInstance;
  let navigateToTestSnap: jest.SpyInstance;

  beforeEach(() => {
    jest
      .mocked(Matchers.getElementByText)
      .mockReturnValue(alertElement as never);
    jest.mocked(Utilities.isElementVisible).mockResolvedValue(false);

    jest.mocked(Browser.tapReloadButton).mockResolvedValue(undefined);
    jest.mocked(waitForTestSnapsToLoad).mockResolvedValue(undefined);

    tapButton = jest.spyOn(TestSnaps, 'tapButton').mockResolvedValue();
    expectEnabledSnapAlert = jest
      .spyOn(TestSnaps, 'expectEnabledSnapAlert')
      .mockResolvedValue();
    navigateToTestSnap = jest
      .spyOn(TestSnaps, 'navigateToTestSnap')
      .mockResolvedValue();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('taps Send Alert once when the enabled dialog is visible', async () => {
    await TestSnaps.tapSendAlertAndExpectEnabled();

    expect(tapButton).toHaveBeenCalledTimes(1);
    expect(tapButton).toHaveBeenCalledWith('sendAlertButton');
    expect(expectEnabledSnapAlert).toHaveBeenCalledTimes(1);
    expect(expectEnabledSnapAlert).toHaveBeenCalledWith(8_000);
    expect(expectEnabledSnapAlert).not.toHaveBeenCalledWith(1_000);
    expect(Utilities.isElementVisible).not.toHaveBeenCalled();
    expect(Browser.tapReloadButton).not.toHaveBeenCalled();
    expect(navigateToTestSnap).not.toHaveBeenCalled();
    expect(Utilities.executeWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      baseRetryOptions,
    );
  });

  it('passes a custom timeout and keeps the other retry options', async () => {
    await TestSnaps.tapSendAlertAndExpectEnabled({ timeout: 45_000 });

    expect(Utilities.executeWithRetry).toHaveBeenCalledWith(
      expect.any(Function),
      {
        ...baseRetryOptions,
        timeout: 45_000,
      },
    );
  });

  it('returns without another tap when the dialog appears on the next probe', async () => {
    expectEnabledSnapAlert.mockRejectedValueOnce(new Error('dialog missing'));
    jest.mocked(Utilities.isElementVisible).mockResolvedValue(true);

    await TestSnaps.tapSendAlertAndExpectEnabled();

    expect(tapButton).toHaveBeenCalledTimes(1);
    expect(Browser.tapReloadButton).not.toHaveBeenCalled();
    expect(navigateToTestSnap).not.toHaveBeenCalled();
    expect(expectEnabledSnapAlert).not.toHaveBeenCalledWith(1_000);
    expect(expectEnabledSnapAlert).toHaveBeenCalledTimes(1);
    expect(expectEnabledSnapAlert).toHaveBeenCalledWith(8_000);
    expect(Utilities.isElementVisible).toHaveBeenCalledWith(
      alertElement,
      1_000,
    );
  });

  it('reloads test-snaps once after two missed alerts and before the third tap', async () => {
    expectEnabledSnapAlert
      .mockRejectedValueOnce(new Error('dialog missing'))
      .mockRejectedValueOnce(new Error('dialog missing'))
      .mockResolvedValueOnce(undefined);

    await TestSnaps.tapSendAlertAndExpectEnabled();

    expect(Utilities.isElementVisible).toHaveBeenCalledTimes(2);
    expect(Browser.tapReloadButton).toHaveBeenCalledTimes(1);
    expect(waitForTestSnapsToLoad).toHaveBeenCalledTimes(1);
    expect(navigateToTestSnap).not.toHaveBeenCalled();
    expect(tapButton).toHaveBeenCalledTimes(3);
    expect(
      jest.mocked(Browser.tapReloadButton).mock.invocationCallOrder[0],
    ).toBeLessThan(tapButton.mock.invocationCallOrder[2]);
    expect(
      jest.mocked(waitForTestSnapsToLoad).mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      jest.mocked(Browser.tapReloadButton).mock.invocationCallOrder[0],
    );
    expect(
      jest.mocked(waitForTestSnapsToLoad).mock.invocationCallOrder[0],
    ).toBeLessThan(tapButton.mock.invocationCallOrder[2]);
    expect(expectEnabledSnapAlert).toHaveBeenNthCalledWith(3, 8_000);
  });

  it('reloads test-snaps only once when the alert is still missing after that reload', async () => {
    expectEnabledSnapAlert
      .mockRejectedValueOnce(new Error('dialog missing'))
      .mockRejectedValueOnce(new Error('dialog missing'))
      .mockRejectedValueOnce(new Error('dialog missing'))
      .mockResolvedValueOnce(undefined);

    await TestSnaps.tapSendAlertAndExpectEnabled();

    expect(Browser.tapReloadButton).toHaveBeenCalledTimes(1);
    expect(waitForTestSnapsToLoad).toHaveBeenCalledTimes(1);
    expect(navigateToTestSnap).not.toHaveBeenCalled();
    expect(tapButton).toHaveBeenCalledTimes(4);
    expect(expectEnabledSnapAlert).toHaveBeenNthCalledWith(4, 8_000);
    expect(Utilities.isElementVisible).toHaveBeenCalledTimes(3);
  });
});
