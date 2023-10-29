import messages from '../../../locales/languages/en.json';

// eslint-disable-next-line import/prefer-default-export
export const ApprovalModalSelectors = {
  ADD_NICKNAME_TEXT: messages.nickname.add_nickname,
  EDIT_NICKNAME_TEXT: messages.nickname.edit_nickname,
  APPROVE_TEXT: messages.transactions.tx_review_approve,
  REJECT_TEXT: messages.transaction.reject,
  APPROVAL_MODAL_CONTAINER_ID: 'approve-modal-test-id',
  COPY_CONTRACT_ADDRESS_ID: 'contract-address',
  APPROVE_TOKEN_AMOUNT_ID: 'custom-spend-cap-input-input-id',
};
