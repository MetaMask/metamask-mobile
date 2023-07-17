import TestHelpers from '../helpers';
import {
  TOKEN_OVERVIEW_SEND_BUTTON,
  TOKEN_ASSET_OVERVIEW,
} from '../../wdio/screen-objects/testIDs/Screens/TokenOverviewScreen.testIds';

export default class TokenOverview {
  static async tapSendButton() {
    await TestHelpers.waitAndTap(TOKEN_OVERVIEW_SEND_BUTTON);
  }

  static async scrollOnScreen() {
    await TestHelpers.swipe('txn-screen', 'up', 'slow', 0.2); // this testID could be renamed.
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(TOKEN_ASSET_OVERVIEW);
  }
}
