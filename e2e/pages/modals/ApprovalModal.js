import TestHelpers from '../../helpers';

const APPROVAL_MODAL_CONTAINER_ID = 'approve-modal-test-id';
const COPY_CONTRACT_ADDRESS_ID = 'contract-address';

export default class ApprovalModal {
  static async tapAddNickName() {
    await TestHelpers.tapByText('Add nickname');
  }
  static async tapEditNickName() {
    await TestHelpers.tapByText('Edit nickname');
  }

  static async tapRejectButton() {
    await TestHelpers.tapByText('Reject');
  }
  static async tapApproveButton() {
    await TestHelpers.tapByText('Approve');
  }
  static async tapToCopyContractAddress() {
    await TestHelpers.tap(COPY_CONTRACT_ADDRESS_ID);
  }
  static async isVisible() {
    await TestHelpers.checkIfVisible(APPROVAL_MODAL_CONTAINER_ID);
  }
  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(APPROVAL_MODAL_CONTAINER_ID);
  }

  static async isContractNickNameVisible(nickName) {
    await TestHelpers.checkIfElementWithTextIsVisible(nickName);
  }
}
