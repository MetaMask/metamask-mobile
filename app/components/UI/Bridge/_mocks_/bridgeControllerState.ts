import { Hex } from '@metamask/utils';

export const mockChainId = '0x1' as Hex;

export const defaultBridgeControllerState = {
  bridgeFeatureFlags: {
    extensionConfig: {
      refreshRate: 30000,
      maxRefreshCount: 2,
      support: true,
      chains: {
        '0x1': { isActiveSrc: true, isActiveDst: true },
      },
    },
    mobileConfig: {
      refreshRate: 30000,
      maxRefreshCount: 2,
      support: true,
      chains: {
        '0x1': { isActiveSrc: true, isActiveDst: true },
      },
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
