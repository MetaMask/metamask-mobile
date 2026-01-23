import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import { Assertions, Utilities } from '../../../tests/framework';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import BrowserView from '../Browser/BrowserView';
import WalletView from './WalletView';
import TrendingView from '../Trending/TrendingView';
class TabBarComponent {
  get tabBarExploreButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.EXPLORE);
  }
  get tabBarBrowserButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.BROWSER);
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

  async tapBrowser(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarBrowserButton);
        await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
      },
      {
        timeout: 10000,
        description: 'Tap Browser Button with Validation',
      },
    );
  }

  async tapHome(): Promise<void> {
    const homeButton = Matchers.getElementByText('Home');
    await Gestures.waitAndTap(homeButton);
  }

  async tapWallet(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarWalletButton);
        await Assertions.expectElementToBeVisible(WalletView.container);
      },
      {
        timeout: 10000,
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
        // Ensure we're on WalletView where the hamburger menu is located
        await this.tapWallet();
        await WalletView.tapHamburgerMenu();
        await Assertions.expectElementToBeVisible(SettingsView.title);
      },
      {
        timeout: 10000,
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
          delay: 3500,
        });
        await Assertions.expectElementToBeVisible(ActivitiesView.title, {
          description: 'Activity View Title',
        });
      },
      {
        timeout: 10000,
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
