import TestHelpers from '../../helpers';
import { ApprovalModalSelectors as ams } from '../../selectors/Modals/ApprovalModal.selectors';

export default class ApprovalModal {
  static async tapAddNickName() {
    await TestHelpers.tapByText(ams.ADD_NICKNAME_TEXT);
  }
  static async tapEditNickName() {
    await TestHelpers.tapByText(ams.EDIT_NICKNAME_TEXT);
  }

  static async tapRejectButton() {
    await TestHelpers.tapByText(ams.REJECT_TEXT);
  }
  static async tapApproveButton() {
    await TestHelpers.tapByText(ams.APPROVE_TEXT);
  }
  static async tapToCopyContractAddress() {
    await TestHelpers.tap(ams.COPY_CONTRACT_ADDRESS_ID);
  }
  static async isVisible() {
    await TestHelpers.checkIfVisible(ams.APPROVAL_MODAL_CONTAINER_ID);
  }
  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ams.APPROVAL_MODAL_CONTAINER_ID);
  }

  static async isContractNickNameVisible(nickName) {
    await TestHelpers.checkIfElementWithTextIsVisible(nickName);
  }
}
