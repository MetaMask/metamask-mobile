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
}
