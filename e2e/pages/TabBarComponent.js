import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';
import {
  TAB_BAR_ACTION_BUTTON,
  TAB_BAR_BROWSER_BUTTON,
  TAB_BAR_SETTING_BUTTON,
  TAB_BAR_WALLET_BUTTON,
  TAB_BAR_ACTIVITY_BUTTON,
} from '../../wdio/screen-objects/testIDs/Components/TabBar.testIds';

class TabBarComponent {
  get tabBarBrowserButton() {
    return Matchers.getElementByID(TAB_BAR_BROWSER_BUTTON);
  }

  get tabBarWalletButton() {
    return Matchers.getElementByID(TAB_BAR_WALLET_BUTTON);
  }

  get tabBarActionButton() {
    return Matchers.getElementByID(TAB_BAR_ACTION_BUTTON);
  }

  get tabBarSettingButton() {
    return Matchers.getElementByID(TAB_BAR_SETTING_BUTTON);
  }

  get tabBarActivityButton() {
    return Matchers.getElementByID(TAB_BAR_ACTIVITY_BUTTON);
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
