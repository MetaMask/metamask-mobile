import TestHelpers from '../../helpers';
import messages from '../../../locales/languages/en.json';

const ADD_NICKNAME_TEXT = messages.nickname.add_nickname;
const EDIT_NICKNAME_TEXT = messages.nickname.edit_nickname;
const APPROVE_TEXT = messages.transactions.tx_review_approve;
const REJECT_TEXT = messages.transaction.reject;
const APPROVAL_MODAL_CONTAINER_ID = 'approve-modal-test-id';
const COPY_CONTRACT_ADDRESS_ID = 'contract-address';

export default class ApprovalModal {
  static async tapAddNickName() {
    await TestHelpers.tapByText(ADD_NICKNAME_TEXT);
  }
  static async tapEditNickName() {
    await TestHelpers.tapByText(EDIT_NICKNAME_TEXT);
  }

  static async tapRejectButton() {
    await TestHelpers.tapByText(REJECT_TEXT);
  }
  static async tapApproveButton() {
    await TestHelpers.tapByText(APPROVE_TEXT);
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
