import { toSentenceCase } from '../../../util/string';
import enContent from '../../../../locales/languages/en.json';

export const QuoteViewSelectorText = {
  NETWORK_FEE: toSentenceCase(enContent.bridge.network_fee),
  CONFIRM_BRIDGE: enContent.bridge.confirm_bridge,
  CONFIRM_SWAP: enContent.bridge.confirm_swap,
  SELECT_AMOUNT: enContent.bridge.select_amount,
  SELECT_ALL: enContent.bridge.see_all,
  FEE_DISCLAIMER: enContent.bridge.fee_disclaimer,
  MAX: enContent.bridge.max,
  INCLUDED: enContent.bridge.included,
};

export const QuoteViewSelectorIDs = {
  TOKEN_SEARCH_INPUT: 'bridge-token-search-input',
  TOKEN_LIST: 'bridge-token-list',
  EXPAND_QUOTE_DETAILS: 'expand-quote-details',
  SOURCE_TOKEN_AREA: 'source-token-area',
  DESTINATION_TOKEN_AREA: 'dest-token-area',
  SOURCE_TOKEN_INPUT: 'source-token-area-input',
  DESTINATION_TOKEN_INPUT: 'dest-token-area-input',
  SOURCE_TOKEN_SELECTOR: 'select-source-token-selector',
  CONFIRM_BUTTON: 'bridge-confirm-button',
  BRIDGE_VIEW_SCROLL: 'bridge-view-scroll',
  BACK_BUTTON: 'button-icon',
};
