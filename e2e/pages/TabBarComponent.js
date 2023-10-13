import TestHelpers from '../helpers';
import {
  TAB_BAR_ACTION_BUTTON,
  TAB_BAR_BROWSER_BUTTON,
  TAB_BAR_WALLET_BUTTON,
} from '../../wdio/screen-objects/testIDs/Components/TabBar.testIds';

export default class TabBarComponent {
  static async tapBrowser() {
    await TestHelpers.waitAndTap(TAB_BAR_BROWSER_BUTTON);
    await TestHelpers.delay(1000);
  }

  static async tapWallet() {
    await TestHelpers.waitAndTap(TAB_BAR_WALLET_BUTTON);
  }

  static async tapActions() {
    await TestHelpers.waitAndTap(TAB_BAR_ACTION_BUTTON);
  }
}
