import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
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
    await Gestures.waitAndTap(this.tabBarBrowserButton);
  }

  async tapWallet() {
    await Gestures.waitAndTap(this.tabBarWalletButton);
  }

  async tapActions() {
    await Gestures.waitAndTap(this.tabBarActionButton);
  }

  async tapSettings() {
    await Gestures.waitAndTap(this.tabBarSettingButton);
  }

  async tapActivity() {
    await Gestures.waitAndTap(this.tabBarActivityButton);
  }
}

export default new TabBarComponent();
