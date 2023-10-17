import TestHelpers from '../helpers';

const CONTRACT_ADD_NICKNAME_CONTAINER_ID = 'contract-nickname-view';
const CONTRACT_ADD_NICKNAME_INPUT_BOX_ID = 'contract-name-input';
const CONFIRM_BUTTON_ID = 'nickname.save_nickname';

export default class ContractNickNameView {
  static async typeContractNickName(nickName) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        CONTRACT_ADD_NICKNAME_INPUT_BOX_ID,
        nickName,
      );
      await element(by.id(CONTRACT_ADD_NICKNAME_INPUT_BOX_ID)).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        CONTRACT_ADD_NICKNAME_INPUT_BOX_ID,
        nickName,
      );
    }
  }

  static async clearNickName() {
    await TestHelpers.replaceTextInField(
      CONTRACT_ADD_NICKNAME_INPUT_BOX_ID,
      '',
    );
  }

  static async tapConfirmButton() {
    await TestHelpers.waitAndTap(CONFIRM_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(CONTRACT_ADD_NICKNAME_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(CONTRACT_ADD_NICKNAME_CONTAINER_ID);
  }

  static async isContractNickNameInInputBoxVisible(nickName) {
    await TestHelpers.checkIfElementWithTextIsVisible(nickName);
  }
}
