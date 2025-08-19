import enContent from '../../../locales/languages/en.json';

function getSentUnitMessage(unit: string) {
  return enContent.transactions.sent_unit.replace('{{unit}}', unit);
}

export const ActivitiesViewSelectorsIDs = {
  CONTAINER: 'transactions-container',
};

export const ActivitiesViewSelectorsText = {
  SUBMITTED_TEXT: enContent.transaction.submitted,
  CONFIRM_TEXT: enContent.transaction.confirmed,
  FAILED_TEXT: enContent.transaction.failed,
  SMART_CONTRACT_INTERACTION: enContent.transactions.smart_contract_interaction,
  INCREASE_ALLOWANCE_METHOD: enContent.transactions.increase_allowance,
  SENT_COLLECTIBLE_MESSAGE_TEXT: enContent.transactions.sent_collectible,
  SENT_TOKENS_MESSAGE_TEXT: (unit: string) => getSentUnitMessage(unit),
  SET_APPROVAL_FOR_ALL_METHOD: enContent.transactions.set_approval_for_all,
  SWAP: enContent.swaps.transaction_label.swap,
  BRIDGE: enContent.bridge_transaction_details.bridge_to_chain,
  APPROVE: enContent.swaps.transaction_label.approve,
  TITLE: enContent.transactions_view.title,
  STAKE_DEPOSIT: enContent.transactions.tx_review_staking_deposit,
  UNSTAKE: enContent.transactions.tx_review_staking_unstake,
  STAKING_CLAIM: enContent.transactions.tx_review_staking_claim,
};

export const sentMessageTokenIDs = {
  eth: ActivitiesViewSelectorsText.SENT_TOKENS_MESSAGE_TEXT(enContent.unit.eth),
};
