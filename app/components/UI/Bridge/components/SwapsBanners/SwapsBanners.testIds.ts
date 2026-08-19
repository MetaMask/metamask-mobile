import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';

export const SwapsBannersSelectorsIDs = {
  CONTAINER: 'swaps-banners',
  // The quote error and missing price banners keep the Market view IDs so
  // existing E2E selectors still match once that view renders this component.
  QUOTE_ERROR: BridgeViewSelectorsIDs.NO_QUOTES_BANNER,
  MISSING_PRICE: BridgeViewSelectorsIDs.MISSING_PRICE_BANNER,
  TOKEN_WARNING: 'swaps-banners-token-warning',
  INSUFFICIENT_NATIVE_RESERVE: 'swaps-banners-insufficient-native-reserve',
  HARDWARE_WALLET_UNSUPPORTED: 'swaps-banners-hardware-wallet-unsupported',
  BLOCKAID_ERROR: 'swaps-banners-blockaid-error',
} as const;
