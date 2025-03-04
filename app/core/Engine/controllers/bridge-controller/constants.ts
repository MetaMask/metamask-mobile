import type { BridgeControllerState } from '@metamask/bridge-controller';

// Default BridgeControllerState
export const defaultBridgeControllerState: BridgeControllerState = {
  bridgeFeatureFlags: {
    extensionConfig: {
      refreshRate: 30000,
      maxRefreshCount: 2,
      support: true,
      chains: {},
    },
    mobileConfig: {
      refreshRate: 30000,
      maxRefreshCount: 2,
      support: true,
      chains: {},
    },
  },
  quoteRequest: {},
  quotes: [],
  quotesInitialLoadTime: null,
  quotesLastFetched: null,
  quotesLoadingStatus: null,
  quoteFetchError: null,
  quotesRefreshCount: 0,
};
