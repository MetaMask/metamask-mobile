import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { TabBarSelectorIDs } from '../../selectors/wallet/TabBar.selectors';

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
    await device.disableSynchronization();
    await Gestures.waitAndTap(this.tabBarBrowserButton, {
      elemDescription: 'Tab Bar - Browser Button',
    });
    await device.enableSynchronization();
  }

  async tapWallet(): Promise<void> {
    await device.disableSynchronization();
    await Gestures.waitAndTap(this.tabBarWalletButton, {
      elemDescription: 'Tab Bar - Wallet Button',
    });
    await device.enableSynchronization();
  }

  async tapActions(): Promise<void> {
    await device.disableSynchronization();
    await Gestures.waitAndTap(this.tabBarActionButton, {
      elemDescription: 'Tab Bar - Actions Button',
    });
    await device.enableSynchronization();
  }

  async tapSettings(): Promise<void> {
    await device.disableSynchronization();
    await Gestures.waitAndTap(this.tabBarSettingButton, {
      elemDescription: 'Tab Bar - Settings Button',
    });
    await device.enableSynchronization();
  }

  async tapActivity(): Promise<void> {
    await device.disableSynchronization();
    await Gestures.waitAndTap(this.tabBarActivityButton, {
      elemDescription: 'Tab Bar - Activity Button',
      delay: 2500,
    });
    await device.enableSynchronization();
  }
}

export default new TabBarComponent();
