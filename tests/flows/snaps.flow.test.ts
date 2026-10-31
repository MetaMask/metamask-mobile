jest.mock('../framework', () => ({
  Assertions: {
    expectElementToBeVisible: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/AccountMenu/AccountMenu', () => ({
  __esModule: true,
  default: {
    container: { id: 'account-menu' },
    tapSettings: jest.fn().mockResolvedValue(undefined),
    tapBack: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/Browser/BrowserView', () => ({
  __esModule: true,
  default: {
    tapCloseBrowserButton: jest.fn().mockResolvedValue(undefined),
    tapReloadButton: jest.fn().mockResolvedValue(undefined),
    selectTabByPartialUrl: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/Browser/TestSnaps', () => ({
  __esModule: true,
  default: {
    navigateToTestSnap: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/Settings/SettingsView', () => ({
  __esModule: true,
  default: {
    title: { id: 'settings-title' },
    tapBackButton: jest.fn().mockResolvedValue(undefined),
    tapSnaps: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/Settings/SnapSettingsView', () => ({
  __esModule: true,
  default: {
    tapBackButton: jest.fn().mockResolvedValue(undefined),
    tapListBackButton: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/Trending/TrendingView', () => ({
  __esModule: true,
  default: {
    tapBrowserButton: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/wallet/TabBarComponent', () => ({
  __esModule: true,
  default: {
    tapExploreButton: jest.fn().mockResolvedValue(undefined),
    tapWallet: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../page-objects/wallet/WalletView', () => ({
  __esModule: true,
  default: {
    tapHamburgerMenu: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./browser.flow', () => ({
  navigateToBrowserView: jest.fn().mockResolvedValue(undefined),
  ensureSingleBrowserTabView: jest.fn().mockResolvedValue(undefined),
  waitForTestSnapsToLoad: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./wallet.flow', () => ({
  loginToAppPlaywright: jest.fn().mockResolvedValue(undefined),
  waitForWalletHomePlaywright: jest.fn().mockResolvedValue(undefined),
}));

import BrowserView from '../page-objects/Browser/BrowserView';
import TestSnaps from '../page-objects/Browser/TestSnaps';
import TrendingView from '../page-objects/Trending/TrendingView';
import {
  ensureSingleBrowserTabView,
  waitForTestSnapsToLoad,
} from './browser.flow';
import { navigateFromSnapSettingsToBrowser } from './snaps.flow';

describe('navigateFromSnapSettingsToBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reloads the open test-snaps tab instead of opening another one', async () => {
    await navigateFromSnapSettingsToBrowser();

    expect(TrendingView.tapBrowserButton).toHaveBeenCalledTimes(1);
    expect(ensureSingleBrowserTabView).toHaveBeenCalledTimes(1);
    expect(BrowserView.tapReloadButton).toHaveBeenCalledTimes(1);
    expect(waitForTestSnapsToLoad).toHaveBeenCalledTimes(1);
    expect(
      jest.mocked(TrendingView.tapBrowserButton).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(ensureSingleBrowserTabView).mock.invocationCallOrder[0],
    );
    expect(
      jest.mocked(ensureSingleBrowserTabView).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(BrowserView.tapReloadButton).mock.invocationCallOrder[0],
    );
    expect(
      jest.mocked(waitForTestSnapsToLoad).mock.invocationCallOrder[0],
    ).toBeGreaterThan(
      jest.mocked(BrowserView.tapReloadButton).mock.invocationCallOrder[0],
    );
    expect(TestSnaps.navigateToTestSnap).not.toHaveBeenCalled();
    expect(BrowserView.selectTabByPartialUrl).not.toHaveBeenCalled();
  });
});
