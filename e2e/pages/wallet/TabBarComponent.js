import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { TabBarSelectorIDs } from '../../selectors/wallet/TabBar.selectors';

class TabBarComponent {
  get tabBarBrowserButton() {
    return Matchers.getElementByID(TabBarSelectorIDs.BROWSER);
  }

  get tabBarWalletButton() {
    return Matchers.getElementByID(TabBarSelectorIDs.WALLET);
  }

  get tabBarActionButton() {
    return Matchers.getElementByID(TabBarSelectorIDs.ACTIONS);
  }

  get tabBarSettingButton() {
    return Matchers.getElementByID(TabBarSelectorIDs.SETTING);
  }

  get tabBarActivityButton() {
    return Matchers.getElementByID(TabBarSelectorIDs.ACTIVITY);
  }

  async tapBrowser() {
    await Gestures.waitAndTap(this.tabBarBrowserButton, {
      elemDescription: 'Tab Bar - Browser Button',
    });
  }

  async tapWallet() {
    await Gestures.waitAndTap(this.tabBarWalletButton, {
      elemDescription: 'Tab Bar - Wallet Button',
    });
  }

  async tapActions() {
    await Gestures.waitAndTap(this.tabBarActionButton, {
      elemDescription: 'Tab Bar - Actions Button',
    });
  }

  async tapSettings() {
    await Gestures.waitAndTap(this.tabBarSettingButton, {
      elemDescription: 'Tab Bar - Settings Button',
    });
  }

  async tapActivity() {
    await Gestures.waitAndTap(this.tabBarActivityButton, {
      elemDescription: 'Tab Bar - Activity Button',
    });
  }
}

export default new TabBarComponent();
