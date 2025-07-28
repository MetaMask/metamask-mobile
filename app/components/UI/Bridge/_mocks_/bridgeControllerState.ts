import { Hex } from '@metamask/utils';

export const mockChainId = '0x1' as Hex;

// Ethereum tokens
export const ethToken1Address =
  '0x0000000000000000000000000000000000000001' as Hex;
export const ethToken2Address =
  '0x0000000000000000000000000000000000000002' as Hex;

// Optimism tokens
export const optimismToken1Address =
  '0x0000000000000000000000000000000000000003' as Hex;

export const defaultBridgeControllerState = {
  quoteRequest: {},
  quotes: [],
  quotesInitialLoadTime: null,
  quotesLastFetched: null,
  quotesLoadingStatus: null,
  quoteFetchError: null,
  quotesRefreshCount: 0,
};
