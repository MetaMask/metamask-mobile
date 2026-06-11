import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import {
  Assertions,
  PlaywrightAssertions,
  Utilities,
  resolve,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import AccountMenu from '../AccountMenu/AccountMenu';
import WalletView from './WalletView';
import TrendingView from '../Trending/TrendingView';

class TabBarComponent {
  get tabBarExploreButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.EXPLORE);
  }

  get tabBarBrowserButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.BROWSER);
  }

  get tabBarWalletButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.WALLET);
  }

  get tabBarActionButton(): EncapsulatedElementType {
    return resolve({
      detoxTestID: TabBarSelectorIDs.TRADE,
      androidAppiumTestID: TabBarSelectorIDs.ACTIONS,
      iosAppiumTestID: TabBarSelectorIDs.ACTIONS,
    });
  }

  get tabBarTradeButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.TRADE);
  }

  get tabBarSettingButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.SETTING);
  }

  get tabBarActivityButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.ACTIVITY);
  }

  get tabBarRewardsButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.REWARDS);
  }

  get homeButton(): EncapsulatedElementType {
    return resolve({
      custom: {
        detox: () => Matchers.getElementByText('Home'),
        appium: () =>
          PlaywrightMatchers.getElementById(TabBarSelectorIDs.WALLET, {
            exact: true,
          }),
      },
    });
  }

  async tapHome(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await encapsulatedAction({
          detox: async () => {
            await UnifiedGestures.waitAndTap(this.homeButton, {
              timeout: 2000,
            });
            await Assertions.expectElementToBeVisible(WalletView.container, {
              timeout: 500,
            });
          },
          appium: async () => {
            await PlaywrightGestures.waitAndTap(
              await asPlaywrightElement(this.homeButton),
            );
            await PlaywrightAssertions.expectElementToBeVisible(
              await asPlaywrightElement(WalletView.container),
              {
                timeout: 500,
              },
            );
          },
        });
      },
      {
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Home Button with Validation',
      },
    );
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
        await UnifiedGestures.waitAndTap(this.tabBarWalletButton, {
          timeout: 2000,
        });
        await encapsulatedAction({
          detox: async () => {
            await Assertions.expectElementToBeVisible(WalletView.container);
            await UnifiedGestures.waitAndTap(WalletView.hamburgerMenuButton);
            await Assertions.expectElementToBeVisible(AccountMenu.container);
          },
          appium: async () => {
            await PlaywrightAssertions.expectElementToBeVisible(
              await asPlaywrightElement(WalletView.container),
              { timeout: 500 },
            );
            await UnifiedGestures.waitAndTap(WalletView.hamburgerMenuButton);
            await PlaywrightAssertions.expectElementToBeVisible(
              await asPlaywrightElement(AccountMenu.container),
              { timeout: 500 },
            );
          },
        });
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
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(SettingsView.title);
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          await asPlaywrightElement(SettingsView.title),
          { description: 'Settings view title' },
        );
      },
    });
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
    await encapsulatedAction({
      detox: async () => {
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
      },
      appium: async () => {
        await PlaywrightGestures.waitAndTap(
          await asPlaywrightElement(this.tabBarActivityButton),
        );
      },
    });
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
