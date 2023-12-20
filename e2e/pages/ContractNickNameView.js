import TestHelpers from '../helpers';
import { ContractNickNameViewSelectorsIDs } from '../selectors/ContractNickNameView.selectors';

export default class ContractNickNameView {
  static async typeContractNickName(nickName) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        ContractNickNameViewSelectorsIDs.NAME_INPUT,
        nickName,
      );
      await element(
        by.id(ContractNickNameViewSelectorsIDs.NAME_INPUT),
      ).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        ContractNickNameViewSelectorsIDs.NAME_INPUT,
        nickName,
      );
    }
  }

  static async clearNickName() {
    await TestHelpers.replaceTextInField(
      ContractNickNameViewSelectorsIDs.NAME_INPUT,
      '',
    );
  }

  static async tapConfirmButton() {
    await TestHelpers.waitAndTap(
      ContractNickNameViewSelectorsIDs.CONFIRM_BUTTON,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      ContractNickNameViewSelectorsIDs.CONTAINER,
    );
  }

  static async isContractNickNameInInputBoxVisible(nickName) {
    await TestHelpers.checkIfElementWithTextIsVisible(nickName);
  }
}
