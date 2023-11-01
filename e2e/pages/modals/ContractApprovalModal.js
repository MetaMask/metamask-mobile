import TestHelpers from '../../helpers';
import { ContractApprovalModalSelectors } from '../../selectors/Modals/ContractApprovalModal.selectors';

export default class ContractApprovalModal {
  static async tapAddNickName() {
    await TestHelpers.tapByText(
      ContractApprovalModalSelectors.ADD_NICKNAME_TEXT,
    );
  }
  static async tapEditNickName() {
    await TestHelpers.tapByText(
      ContractApprovalModalSelectors.EDIT_NICKNAME_TEXT,
    );
  }

  static async tapRejectButton() {
    await TestHelpers.tapByText(ContractApprovalModalSelectors.REJECT_TEXT);
  }
  static async tapApproveButton() {
    await TestHelpers.tapByText(ContractApprovalModalSelectors.APPROVE_TEXT);
  }
  static async tapToCopyContractAddress() {
    await TestHelpers.tap(
      ContractApprovalModalSelectors.COPY_CONTRACT_ADDRESS_ID,
    );
  }
  static async isVisible() {
    await TestHelpers.checkIfVisible(
      ContractApprovalModalSelectors.APPROVAL_MODAL_CONTAINER_ID,
    );
  }
  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      ContractApprovalModalSelectors.APPROVAL_MODAL_CONTAINER_ID,
    );
  }

  static async isContractNickNameVisible(nickName) {
    await TestHelpers.checkIfElementWithTextIsVisible(nickName);
  }
}
