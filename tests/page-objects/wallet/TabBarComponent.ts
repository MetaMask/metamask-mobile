import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import { Assertions, Utilities } from '../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import AccountMenu from '../AccountMenu/AccountMenu';
import WalletView from './WalletView';
import TrendingView from '../Trending/TrendingView';

class TabBarComponent {
  get tabBarExploreButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.EXPLORE),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.EXPLORE, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.EXPLORE,
          ),
      },
    });
  }

  get tabBarBrowserButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.BROWSER),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.BROWSER, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.BROWSER,
          ),
      },
    });
  }

  get tabBarWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.WALLET),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.WALLET, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.WALLET,
          ),
      },
    });
  }

  get tabBarActionButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.TRADE),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.ACTIONS, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.ACTIONS,
          ),
      },
    });
  }

  get tabBarTradeButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.TRADE),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.TRADE, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.TRADE,
          ),
      },
    });
  }

  get tabBarSettingButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.SETTING),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.SETTING, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.SETTING,
          ),
      },
    });
  }

  get tabBarActivityButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.ACTIVITY),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.ACTIVITY, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.ACTIVITY,
          ),
      },
    });
  }

  get tabBarRewardsButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.REWARDS),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.REWARDS, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            TabBarSelectorIDs.REWARDS,
          ),
      },
    });
  }

  async tapHome(): Promise<void> {
    const homeButton = Matchers.getElementByText('Home');
    await Gestures.waitAndTap(homeButton);
  }

  async tapWallet(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await UnifiedGestures.waitAndTap(this.tabBarWalletButton, {
          timeout: 2000,
        });
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 500,
        });
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s assertion). 15 retries ≈ ~37s total budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Wallet Button with Validation',
      },
    );
  }

  async tapBrowser(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tabBarBrowserButton, {
      description: 'Tab Bar - Browser Button',
    });
  }

  async tapActions(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tabBarActionButton, {
      description: 'Tab Bar - Trade Button',
    });
  }

  async tapTrade(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tabBarTradeButton, {
      description: 'Tab Bar - Trade Button',
    });
  }

  async tapAccountsMenu(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await UnifiedGestures.waitAndTap(this.tabBarWalletButton);
        await Assertions.expectElementToBeVisible(WalletView.container);
        await Gestures.waitAndTap(WalletView.hamburgerMenuButton);
        await Assertions.expectElementToBeVisible(AccountMenu.container);
      },
      {
        timeout: 45000,
        description: 'Tap Accounts Menu Button',
      },
    );
  }

  async tapSettings(): Promise<void> {
    await this.tapAccountsMenu();
    await AccountMenu.tapSettings();
    await Assertions.expectElementToBeVisible(SettingsView.title);
  }
  async tapExploreButton(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await UnifiedGestures.waitAndTap(this.tabBarExploreButton, {
          timeout: 2000,
        });
        await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
          description: 'Trending view search button should be visible',
          timeout: 500,
        });
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s assertion). 15 retries ≈ ~37s total budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Explore Button with Validation',
      },
    );
  }

  async tapActivity(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await UnifiedGestures.waitAndTap(this.tabBarActivityButton, {
          timeout: 2000,
        });
        await Assertions.expectElementToBeVisible(ActivitiesView.title, {
          description: 'Activity View Title',
          timeout: 500,
        });
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s assertion). 15 retries ≈ ~37s total budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Activity Button',
      },
    );
  }

  async tapRewards(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await UnifiedGestures.waitAndTap(this.tabBarRewardsButton, {
          timeout: 2000,
        });
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s default delay) + 500ms retry interval ≈ 3s/cycle → ~15 retries within 45s.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Rewards Button',
      },
    );
  }
}

export default new TabBarComponent();
