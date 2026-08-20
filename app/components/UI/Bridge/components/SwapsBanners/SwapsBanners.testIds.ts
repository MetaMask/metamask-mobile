import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';

export const SwapsBannersSelectorsIDs = {
  CONTAINER: 'swaps-banners',
  // The quote error and missing quote price banners keep the Market view IDs so
  // existing E2E selectors still match once that view renders this component.
  QUOTE_ERROR: BridgeViewSelectorsIDs.NO_QUOTES_BANNER,
  MISSING_QUOTE_PRICE: BridgeViewSelectorsIDs.MISSING_PRICE_BANNER,
  MISSING_QUOTE_AND_ASSETS_PRICE:
    'swaps-banners-missing-quote-and-assets-price',
  TOKEN_WARNING: 'swaps-banners-token-warning',
  INSUFFICIENT_NATIVE_RESERVE: 'swaps-banners-insufficient-native-reserve',
  HARDWARE_WALLET_UNSUPPORTED: 'swaps-banners-hardware-wallet-unsupported',
  HARDWARE_WALLET_ORDER_TYPE_UNSUPPORTED:
    'swaps-banners-hardware-wallet-order-type-unsupported',
  BLOCKAID_ERROR: 'swaps-banners-blockaid-error',
  OFF_HOURS_TRADING: BridgeViewSelectorsIDs.OFF_HOURS_TRADING_BANNER,
  MARKET_CLOSED: BridgeViewSelectorsIDs.MARKET_CLOSED_BANNER,
} as const;
