import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import { Assertions, Utilities } from '../../framework';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import WalletView from './WalletView';
import TrendingView from '../Trending/TrendingView';

class TabBarComponent {
  get tabBarExploreButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.EXPLORE);
  }

  get tabBarWalletButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.WALLET);
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

  async tapWallet(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarWalletButton, {
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
    await Utilities.executeWithRetry(
      async () => {
        // Navigate to Wallet first (where the hamburger menu lives)
        await Gestures.waitAndTap(this.tabBarWalletButton, { timeout: 2000 });
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 500,
        });
        await WalletView.tapHamburgerMenu();
        await Assertions.expectElementToBeVisible(SettingsView.title, {
          timeout: 500,
        });
      },
      {
        // Each attempt: ~3s (2s tap + 0.5s wallet check + hamburger + 0.5s settings check).
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Settings Button',
      },
    );
  }
  async tapExploreButton(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarExploreButton);
        await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
          description: 'Trending view search button should be visible',
        });
      },
      {
        timeout: 10000,
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
          delay: 2500,
        });
      },
      {
        timeout: 10000,
        description: 'Tap Rewards Button',
      },
    );
  }
}

export default new TabBarComponent();
