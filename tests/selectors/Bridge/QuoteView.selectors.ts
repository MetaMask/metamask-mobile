import { toSentenceCase } from '../../../app/util/string';
import enContent from '../../../locales/languages/en.json';

/** Default fee percentage (0.875%) used when quote has MetaMask fee. */
const DEFAULT_FEE_PERCENTAGE = '0.875';

/**
 * Rendered text when quote includes MetaMask fee (used for isQuoteDisplayed assertion).
 * Derived from en.json fee_disclaimer template - stays in sync with app copy.
 */
export const FEE_DISCLAIMER_QUOTE_VISIBLE =
  enContent.bridge.fee_disclaimer.replace(
    '{{feePercentage}}',
    DEFAULT_FEE_PERCENTAGE,
  );

export const QuoteViewSelectorText = {
  NETWORK_FEE: toSentenceCase(enContent.bridge.network_fee),
  CONFIRM_BRIDGE: enContent.bridge.confirm_bridge,
  CONFIRM_SWAP: enContent.bridge.confirm_swap,
  SELECT_AMOUNT: enContent.bridge.select_amount,
  SELECT_ALL: enContent.bridge.see_all,
  FEE_DISCLAIMER: enContent.bridge.fee_disclaimer,
  FEE_DISCLAIMER_QUOTE_VISIBLE,
  MAX: enContent.bridge.max,
  INCLUDED: enContent.bridge.included,
  RATE: enContent.bridge.rate,
};

// Performance tests only: Maps network name to chain ID for token selection.
export const NETWORK_TO_CHAIN_ID: Record<string, string> = {
  Ethereum: '0x1',
  Polygon: '0x89',
  Solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export function getChainIdForNetwork(network: string): string {
  return NETWORK_TO_CHAIN_ID[network] ?? '0x1';
}

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
  FEE_DISCLAIMER: 'bridge-fee-disclaimer',
  KEYPAD_DELETE_BUTTON: 'keypad-delete-button',
  BACK_BUTTON: 'button-icon',
};
