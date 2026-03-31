import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import { Assertions, Utilities } from '../../framework';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import WalletView from './WalletView';
import TrendingView from '../Trending/TrendingView';
import WalletActionsBottomSheet from './WalletActionsBottomSheet';

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
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarActionButton, {
          timeout: 2000,
          elemDescription: 'Tab Bar - Trade Button',
        });
        await Assertions.expectElementToBeVisible(
          WalletActionsBottomSheet.swapButton,
          { timeout: 500 },
        );
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s assertion). 15 retries ≈ ~37s total budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Actions Button with Validation',
      },
    );
  }

  async tapTrade(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarTradeButton, {
          timeout: 2000,
          elemDescription: 'Tab Bar - Trade Button',
        });
        await Assertions.expectElementToBeVisible(
          WalletActionsBottomSheet.swapButton,
          { timeout: 500 },
        );
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s assertion). 15 retries ≈ ~37s total budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Trade Button with Validation',
      },
    );
  }

  async tapSettings(): Promise<void> {
    await this.tapWallet();
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(WalletView.hamburgerMenuButton, {
          timeout: 2000,
        });
        await Assertions.expectElementToBeVisible(SettingsView.title, {
          timeout: 500,
        });
      },
      {
        // Each attempt: ~2.5s (2s tap + 0.5s assertion). 15 retries ≈ ~37s total budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Hamburger Menu to open Settings',
      },
    );
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
