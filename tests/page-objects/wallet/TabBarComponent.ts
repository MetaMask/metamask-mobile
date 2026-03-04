import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import { Assertions, PlaywrightGestures, Utilities } from '../../framework';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import WalletView from './WalletView';
import TrendingView from '../Trending/TrendingView';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class TabBarComponent {
  get tabBarExploreButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.EXPLORE);
  }

  get tabBarWalletButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.WALLET),
      appium: () => PlaywrightMatchers.getElementById(TabBarSelectorIDs.WALLET),
    });
  }

  get tabBarBrowserButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(TabBarSelectorIDs.BROWSER),
      appium: () =>
        PlaywrightMatchers.getElementById(TabBarSelectorIDs.BROWSER),
    });
  }

  get tabBarActionButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.TRADE);
  }

  get tabBarTradeButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.TRADE);
  }

  get tabBarSettingButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.SETTING);
  }

  get tabBarActivityButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.ACTIVITY);
  }

  get tabBarRewardsButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.REWARDS);
  }

  async tapHome(): Promise<void> {
    const homeButton = Matchers.getElementByText('Home');
    await Gestures.waitAndTap(homeButton);
  }

  async tapBrowser(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.tabBarBrowserButton, {
      description: 'Tab Bar - Browser Button',
    });
  }

  async tapWallet(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Utilities.executeWithRetry(
          async () => {
            await Gestures.waitAndTap(
              Matchers.getElementByID(TabBarSelectorIDs.WALLET),
              { timeout: 2000 },
            );
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
      },
      appium: async () => {
        const walletBtn = await asPlaywrightElement(this.tabBarWalletButton);
        await walletBtn.waitForDisplayed();
        await walletBtn.click();
      },
    });
  }

  async tapActions(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarActionButton, {
      elemDescription: 'Tab Bar - Trade Button',
    });
  }

  async tapTrade(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarTradeButton, {
      elemDescription: 'Tab Bar - Trade Button',
    });
  }

  async tapSettings(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Utilities.executeWithRetry(
          async () => {
            // Navigate to Wallet first (where the hamburger menu lives)
            await Gestures.waitAndTap(this.tabBarWalletButton as DetoxElement);
            await Assertions.expectElementToBeVisible(WalletView.container);
            await Gestures.waitAndTap(WalletView.hamburgerMenuButton);
            await Assertions.expectElementToBeVisible(SettingsView.title);
          },
          {
            timeout: 45000,
            description: 'Tap Settings Button',
          },
        );
      },
      appium: async () => {
        const settingsBtn = await asPlaywrightElement(this.tabBarSettingButton);
        await PlaywrightGestures.tap(settingsBtn);
      },
    });
  }
  async tapExploreButton(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarExploreButton, {
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
        await Gestures.waitAndTap(this.tabBarActivityButton, {
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
        await Gestures.waitAndTap(this.tabBarRewardsButton, {
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
