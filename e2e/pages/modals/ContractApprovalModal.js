import TestHelpers from '../../helpers';
import { ContractApprovalModalSelectors as cams } from '../../selectors/Modals/ContractApprovalModal.selectors';

export default class ContractApprovalModal {
  static async tapAddNickName() {
    await TestHelpers.tapByText(cams.ADD_NICKNAME_TEXT);
  }
  static async tapEditNickName() {
    await TestHelpers.tapByText(cams.EDIT_NICKNAME_TEXT);
  }

  static async tapRejectButton() {
    await TestHelpers.tapByText(cams.REJECT_TEXT);
  }
  static async tapApproveButton() {
    await TestHelpers.tapByText(cams.APPROVE_TEXT);
  }
  static async tapToCopyContractAddress() {
    await TestHelpers.tap(cams.COPY_CONTRACT_ADDRESS_ID);
  }
  static async isVisible() {
    await TestHelpers.checkIfVisible(cams.APPROVAL_MODAL_CONTAINER_ID);
  }
  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(cams.APPROVAL_MODAL_CONTAINER_ID);
  }

  static async isContractNickNameVisible(nickName) {
    await TestHelpers.checkIfElementWithTextIsVisible(nickName);
  }
}
