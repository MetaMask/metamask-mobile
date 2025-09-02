import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { TabBarSelectorIDs } from '../../selectors/wallet/TabBar.selectors';
import { Assertions, Utilities } from '../../framework';
import ActivitiesView from '../Transactions/ActivitiesView';
import SettingsView from '../Settings/SettingsView';
import BrowserView from '../Browser/BrowserView';
import WalletView from './WalletView';
class TabBarComponent {
  get tabBarBrowserButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.BROWSER);
  }

  get tabBarWalletButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.WALLET);
  }

  get tabBarActionButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.ACTIONS);
  }

  get tabBarSettingButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.SETTING);
  }

  get tabBarActivityButton(): DetoxElement {
    return Matchers.getElementByID(TabBarSelectorIDs.ACTIVITY);
  }

  async tapBrowser(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarBrowserButton);
        await Assertions.expectElementToBeVisible(BrowserView.homeButton);
      },
      {
        timeout: 10000,
        description: 'Tap Browser Button with Validation',
      },
    );
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
    await device.disableSynchronization();
    await Gestures.waitAndTap(this.tabBarActionButton, {
      elemDescription: 'Tab Bar - Actions Button',
    });
    await device.enableSynchronization();
  }

  async tapSettings(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarSettingButton, {
          elemDescription: 'Tab Bar - Settings Button',
        });
        await Assertions.expectElementToBeVisible(SettingsView.title);
      },
      {
        timeout: 10000,
        description: 'Tap Settings Button',
      },
    );
  }

  async tapActivity(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(this.tabBarActivityButton, {
          delay: 2500,
        });
        await Assertions.expectElementToBeVisible(ActivitiesView.title);
      },
      {
        timeout: 10000,
        description: 'Tap Activity Button',
      },
    );
  }
}

export default new TabBarComponent();
