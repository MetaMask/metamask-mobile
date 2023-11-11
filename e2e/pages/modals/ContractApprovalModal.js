import TestHelpers from '../../helpers';
import {
  ContractApprovalModalSelectorsIDs,
  ContractApprovalModalSelectorsText,
} from '../../selectors/Modals/ContractApprovalModal.selectors';

export default class ContractApprovalModal {
  static async tapAddNickName() {
    await TestHelpers.tapByText(
      ContractApprovalModalSelectorsText.ADD_NICKNAME,
    );
  }
  static async tapEditNickName() {
    await TestHelpers.tapByText(
      ContractApprovalModalSelectorsText.EDIT_NICKNAME,
    );
  }

  static async tapRejectButton() {
    await TestHelpers.tapByText(ContractApprovalModalSelectorsText.REJECT);
  }

  static async tapApproveButton() {
    await TestHelpers.tapByText(ContractApprovalModalSelectorsText.APPROVE);
  }
  static async tapToCopyContractAddress() {
    await TestHelpers.tap(ContractApprovalModalSelectorsIDs.CONTRACT_ADDRESS);
  }

  static async tapNextButton() {
    await TestHelpers.tapByText(ContractApprovalModalSelectorsText.NEXT);
  }

  static async inputCustomAmount(amount) {
    await TestHelpers.checkIfExists(
      ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT,
    );
    await TestHelpers.typeTextAndHideKeyboard(
      ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT,
      amount,
    );
  }

  static async clearAndInputCustomAmount(amount) {
    await TestHelpers.checkIfExists(
      ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT,
    );
    await TestHelpers.clearField(
      ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT,
    );
    await TestHelpers.typeText(
      ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT,
      amount + '\n',
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      ContractApprovalModalSelectorsIDs.CONTAINER,
    );
  }
  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      ContractApprovalModalSelectorsIDs.CONTAINER,
    );
  }

  static async isContractNickNameVisible(nickName) {
    await TestHelpers.checkIfElementWithTextIsVisible(nickName);
  }

  static async isTokenAmountVisible(amount) {
    await expect(
      element(by.id(ContractApprovalModalSelectorsIDs.APPROVE_TOKEN_AMOUNT)),
    ).toHaveText(amount);
  }
}
