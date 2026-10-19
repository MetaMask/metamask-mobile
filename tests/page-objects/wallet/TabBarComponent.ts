import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { TabBarSelectorIDs } from '../../../app/components/Nav/Main/TabBar.testIds';
import {
  Assertions,
  PlatformDetector,
  Utilities,
  type AppiumElement,
  sleep,
} from '../../framework';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants';
import { waitForWalletHomePlaywright } from '../../flows/wallet.flow';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import AccountMenu from '../AccountMenu/AccountMenu';
import WalletView from './WalletView';
import WalletActionsBottomSheet from './WalletActionsBottomSheet';
import TrendingView from '../Trending/TrendingView';

/** Native iOS 26 tab items have no testID; UIKit exposes them by title. */
const NATIVE_TAB_LABELS = {
  WALLET: 'Home',
  EXPLORE: 'Explore',
  ACTIVITY: 'Activity',
  MONEY: 'Money',
  REWARDS: 'Rewards',
} as const;

const NATIVE_TAB_BAR_MIN_IOS_VERSION = 26;

class TabBarComponent {
  private tabItem(
    testId: string,
    nativeLabel: (typeof NATIVE_TAB_LABELS)[keyof typeof NATIVE_TAB_LABELS],
  ): Promise<AppiumElement> {
    if (PlatformDetector.isIOSAtLeast(NATIVE_TAB_BAR_MIN_IOS_VERSION)) {
      return Matchers.getElementByLabel(nativeLabel);
    }
    return Matchers.getElementByID(testId);
  }

  get tabBarExploreButton(): Promise<AppiumElement> {
    return this.tabItem(TabBarSelectorIDs.EXPLORE, NATIVE_TAB_LABELS.EXPLORE);
  }

  get tabBarBrowserButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TabBarSelectorIDs.BROWSER);
  }

  get tabBarWalletButton(): Promise<AppiumElement> {
    return this.tabItem(TabBarSelectorIDs.WALLET, NATIVE_TAB_LABELS.WALLET);
  }

  get tabBarActionButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TabBarSelectorIDs.ACTIONS);
  }

  get tabBarTradeButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TabBarSelectorIDs.TRADE);
  }

  get tabBarSettingButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(TabBarSelectorIDs.SETTING);
  }

  get tabBarActivityButton(): Promise<AppiumElement> {
    return this.tabItem(TabBarSelectorIDs.ACTIVITY, NATIVE_TAB_LABELS.ACTIVITY);
  }

  get tabBarRewardsButton(): Promise<AppiumElement> {
    return this.tabItem(TabBarSelectorIDs.REWARDS, NATIVE_TAB_LABELS.REWARDS);
  }

  get tabBarMoneyButton(): Promise<AppiumElement> {
    return this.tabItem(TabBarSelectorIDs.MONEY, NATIVE_TAB_LABELS.MONEY);
  }

  get homeButton(): Promise<AppiumElement> {
    return this.tabItem(TabBarSelectorIDs.WALLET, NATIVE_TAB_LABELS.WALLET);
  }

  private async dismissStackedActivity(): Promise<void> {
    const isActivityVisible = await Utilities.isElementVisible(
      ActivitiesView.redesignedScreen,
      500,
    );
    if (isActivityVisible) {
      await ActivitiesView.tapBackButton();
    }
  }

  async tapHome(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await this.dismissStackedActivity();
        await Gestures.waitAndTap(this.homeButton, {
          elemDescription: 'Tab Bar - Home Button',
          timeout: 2000,
        });
        if (PlatformDetector.isIOS()) {
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
        } else {
          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet home screen',
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
        await Gestures.waitAndTap(this.tabBarWalletButton, {
          elemDescription: 'Tab Bar - Wallet Button',
          timeout: 5_000,
        });

        if (PlatformDetector.isIOS()) {
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
        } else {
          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet home screen',
            timeout: 5_000,
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
        if (PlatformDetector.isIOS()) {
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
        await Gestures.waitAndTap(this.tabBarExploreButton, {
          elemDescription: 'Tab Bar - Explore Button',
          timeout: 5_000,
        });
        await Assertions.expectElementToBeVisible(TrendingView.searchButton, {
          description: 'Trending view search button should be visible',
          timeout: 5_000,
        });
      },
      {
        // Each attempt: tap + Trending readiness assert. Keep a 45s outer budget.
        maxRetries: 15,
        timeout: 45000,
        description: 'Tap Explore Button with Validation',
      },
    );
  }

  async tapActivity(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const alreadyOnActivity = await Utilities.isElementVisible(
          ActivitiesView.redesignedScreen,
          500,
        );
        if (!alreadyOnActivity) {
          const isMoneyTabVisible = await Utilities.isElementVisible(
            this.tabBarMoneyButton,
            500,
          );
          if (isMoneyTabVisible) {
            const isWalletActivityButtonVisible =
              await Utilities.isElementVisible(WalletView.activityButton, 500);
            if (!isWalletActivityButtonVisible) {
              await Gestures.waitAndTap(this.tabBarWalletButton, {
                timeout: 2_000,
                elemDescription: 'Tab Bar - Wallet Button',
              });
            }
            await Gestures.waitAndTap(WalletView.activityButton, {
              timeout: 5_000,
              elemDescription: 'Wallet Activity button',
            });
          } else {
            await Gestures.waitAndTap(this.tabBarActivityButton, {
              timeout: 2_000,
              elemDescription: 'Tab Bar - Activity Button',
            });
          }
        }
        await Assertions.expectElementToBeVisible(
          ActivitiesView.redesignedScreen,
          {
            description: 'Activity View Screen',
            timeout: 500,
          },
        );
        await Assertions.expectElementToBeVisible(ActivitiesView.container, {
          description: 'Activity List',
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

  async tapMoney(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarMoneyButton, {
      elemDescription: 'Tab Bar - Money Button',
      timeout: 5000,
    });
  }
}

export default new TabBarComponent();
