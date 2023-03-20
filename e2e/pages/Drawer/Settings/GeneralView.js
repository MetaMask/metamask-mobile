import TestHelpers from '../../../helpers';
import { BACK_ARROW_BUTTON_ID } from '../../../../app/constants/test-ids';
import { HIDE_TOKENS_WITHOUT_BALANCE_TOGGLE } from '../../../../wdio/screen-objects/testIDs/Screens/GeneralScreen.testids';

export default class GeneralView {
  static async toggleHideZeroBalance() {
    await TestHelpers.tap(HIDE_TOKENS_WITHOUT_BALANCE_TOGGLE);
  }

  static async scrollToBottomOfView() {
    await TestHelpers.swipeByText('Primary Currency', 'up', 'fast', 0.9);
  }

  static async tapBackButton() {
    await TestHelpers.tap(BACK_ARROW_BUTTON_ID);
  }
}
