import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import {
  Assertions,
  FrameworkDetector,
  PlatformDetector,
  Utilities,
  resolve,
  EncapsulatedElementType,
  sleep,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import { waitForWalletHomePlaywright } from '../../flows/wallet.flow';
import { encapsulated } from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import AccountMenu from '../AccountMenu/AccountMenu';
import WalletView from './WalletView';
import WalletActionsBottomSheet from './WalletActionsBottomSheet';
import TrendingView from '../Trending/TrendingView';

class TabBarComponent {
  get tabBarExploreButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.EXPLORE);
  }

  get tabBarBrowserButton(): EncapsulatedElementType {
    return Matchers.getElementByID(TabBarSelectorIDs.BROWSER);
  }

  get tabBarWalletButton(): EncapsulatedElementType {
    return resolve({
      detoxTestID: TabBarSelectorIDs.WALLET,
      androidAppiumTestID: TabBarSelectorIDs.WALLET,
      iosAppiumTestID: TabBarSelectorIDs.WALLET,
    });
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
    return encapsulated({
      detox: () => Matchers.getElementByText('Home'),
      appium: () =>
        PlaywrightMatchers.getElementById(TabBarSelectorIDs.WALLET, {
          exact: true,
        }),
    });
  }

  async tapHome(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.homeButton, { timeout: 2000 });
        if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
        } else {
          await Assertions.expectElementToBeVisible(WalletView.container, {
            timeout: 500,
          });
        }
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
        await Gestures.waitAndTap(this.tabBarWalletButton, { timeout: 2000 });
        if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
        } else {
          await Assertions.expectElementToBeVisible(WalletView.container, {
            timeout: 500,
          });
        }
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
    await Gestures.waitAndTap(this.tabBarBrowserButton, {
      elemDescription: 'Tab Bar - Browser Button',
    });
  }

  async tapActions(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        // TradeTabBarItem measures buttonLayout async; tap before layout is ready
        // opens TradeWalletActions with invalid params and the sheet dismisses.
        await sleep(500);
        await Gestures.waitAndTap(this.tabBarActionButton, {
          elemDescription: 'Tab Bar - Actions Button',
          timeout: 5000,
        });
        // TradeWalletActions (not legacy WalletActionsBottomSheet) exposes swap/perps/predict — not send.
        await Assertions.expectElementToBeVisible(
          WalletActionsBottomSheet.swapButton,
          { timeout: 10000 },
        );
      },
      {
        timeout: 45000,
        description: 'Open wallet actions bottom sheet',
      },
    );
  }

  async tapTrade(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarTradeButton, {
      elemDescription: 'Tab Bar - Trade Button',
    });
  }

  async tapAccountsMenu(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarWalletButton, { timeout: 2000 });
        if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
        } else {
          await Assertions.expectElementToBeVisible(WalletView.container, {
            timeout: 500,
          });
        }
        await Gestures.waitAndTap(WalletView.hamburgerMenuButton);
        await Assertions.expectElementToBeVisible(AccountMenu.container, {
          timeout: 500,
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
    await Assertions.expectElementToBeVisible(SettingsView.title);
  }
  async tapExploreButton(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarExploreButton, { timeout: 2000 });
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
        await Gestures.waitAndTap(this.tabBarActivityButton, { timeout: 2000 });
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
        await Gestures.waitAndTap(this.tabBarRewardsButton, { timeout: 2000 });
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
