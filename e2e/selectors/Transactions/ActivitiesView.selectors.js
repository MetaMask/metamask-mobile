import enContent from '../../../locales/languages/en.json';

function getSentUnitMessage(unit) {
  return enContent.transactions.sent_unit.replace('{{unit}}', unit);
}

export const ActivitiesViewSelectorsIDs = {
  CONTAINER: 'transactions-container',
};

export const ActivitiesViewSelectorsText = {
  CONFIRM_TEXT: enContent.transaction.confirmed,
  FAILED_TEXT: enContent.transaction.failed,
  SMART_CONTRACT_INTERACTION: enContent.transactions.smart_contract_interaction,
  INCREASE_ALLOWANCE_METHOD: enContent.transactions.increase_allowance,
  SENT_COLLECTIBLE_MESSAGE_TEXT: enContent.transactions.sent_collectible,
  SENT_TOKENS_MESSAGE_TEXT: (unit) => getSentUnitMessage(unit),
  SET_APPROVAL_FOR_ALL_METHOD: enContent.transactions.set_approval_for_all,
  SWAP: enContent.swaps.transaction_label.swap,
  APPROVE: enContent.swaps.transaction_label.approve,
  TITLE: enContent.transactions_view.title,

};

export const sentMessageTokenIDs = {
  eth: ActivitiesViewSelectorsText.SENT_TOKENS_MESSAGE_TEXT(enContent.unit.eth)
};
