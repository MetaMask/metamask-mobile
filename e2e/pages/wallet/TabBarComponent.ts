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
    await Gestures.waitAndTap(this.tabBarBrowserButton, {
      elemDescription: 'Tab Bar - Browser Button',
    });
  }

  async tapWallet(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarWalletButton, {
      elemDescription: 'Tab Bar - Wallet Button',
    });
  }

  async tapActions(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarActionButton, {
      elemDescription: 'Tab Bar - Actions Button',
    });
  }

  async tapSettings(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarSettingButton, {
      elemDescription: 'Tab Bar - Settings Button',
    });
  }

  async tapActivity(): Promise<void> {
    await Gestures.waitAndTap(this.tabBarActivityButton, {
      elemDescription: 'Tab Bar - Activity Button',
    });
  }
}

export default new TabBarComponent();
