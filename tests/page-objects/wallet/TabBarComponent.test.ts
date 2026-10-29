jest.mock('../../framework/Matchers', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn((testId: string) => Promise.resolve({ testId })),
    getElementByLabel: jest.fn(),
  },
}));

jest.mock('../../framework/Gestures', () => ({
  __esModule: true,
  default: {
    waitAndTap: jest.fn(),
    tap: jest.fn(),
  },
}));

jest.mock('../../framework/Assertions', () => ({
  __esModule: true,
  default: {
    expectElementToBeVisible: jest.fn(),
  },
}));

jest.mock('../../framework', () => ({
  Assertions: {
    expectElementToBeVisible: jest.fn(),
  },
  PlatformDetector: {
    isIOSAtLeast: jest.fn(() => false),
    isAndroid: jest.fn(() => true),
  },
  Utilities: {
    executeWithRetry: jest.fn(async (operation: () => Promise<void>) =>
      operation(),
    ),
    isElementVisible: jest.fn(),
  },
  sleep: jest.fn(),
}));

jest.mock('../../framework/Constants', () => ({
  resolveE2EWaitTimeoutMs: jest.fn((timeout: number) => timeout),
}));

jest.mock('../../flows/wallet.flow', () => ({
  waitForWalletHomePlaywright: jest.fn(),
}));

jest.mock('../Transactions/ActivitiesView', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../Settings/SettingsView', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../AccountMenu/AccountMenu', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('./WalletView', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('./WalletActionsBottomSheet', () => ({
  __esModule: true,
  default: {},
}));

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { Assertions, Utilities } from '../../framework';
import { TrendingViewSelectorsIDs } from '../../locators/Trending/TrendingView.selectors';
import TabBarComponent from './TabBarComponent';

describe('TabBarComponent.tapExploreButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('taps Explore and waits for the Explore browser button', async () => {
    jest.mocked(Utilities.isElementVisible).mockResolvedValue(false);

    await TabBarComponent.tapExploreButton();

    expect(Gestures.waitAndTap).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        elemDescription: 'Tab Bar - Explore Button',
        timeout: 5_000,
      }),
    );
    expect(Gestures.waitAndTap).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({
        waitForInteractive: true,
      }),
    );
    expect(Assertions.expectElementToBeVisible).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        description: 'Explore tab content should be visible',
      }),
    );
    expect(Utilities.isElementVisible).toHaveBeenCalledWith(
      expect.anything(),
      500,
    );
    expect(Matchers.getElementByID).toHaveBeenCalledWith(
      TrendingViewSelectorsIDs.BROWSER_BUTTON,
    );
    expect(Matchers.getElementByID).not.toHaveBeenCalledWith(
      TrendingViewSelectorsIDs.SEARCH_BUTTON,
    );
  });

  it('skips the tap when the Explore browser button is already visible', async () => {
    jest.mocked(Utilities.isElementVisible).mockResolvedValue(true);

    await TabBarComponent.tapExploreButton();

    expect(Gestures.waitAndTap).not.toHaveBeenCalled();
    expect(Assertions.expectElementToBeVisible).toHaveBeenCalled();
    expect(Matchers.getElementByID).toHaveBeenCalledWith(
      TrendingViewSelectorsIDs.BROWSER_BUTTON,
    );
  });
});
