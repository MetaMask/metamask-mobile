import enContent from '../../locales/languages/en.json';

function getSentUnitMessage(unit) {
  return enContent.transactions.sent_unit.replace('{{unit}}', unit);
}

// eslint-disable-next-line import/prefer-default-export
export const ActivitiesViewSelectorsText = {
  TITLE: enContent.transactions_view.title,
  SWAP: enContent.swaps.transaction_label.swap,
  SENT_COLLECTIBLE_MESSAGE_TEXT: enContent.transactions.sent_collectible,
  SENT_TOKENS_MESSAGE_TEXT: (unit) => getSentUnitMessage(unit),
  CONFIRM_TEXT: enContent.transaction.confirmed,
  INCREASE_ALLOWANCE_METHOD: enContent.transactions.increase_allowance,
};
