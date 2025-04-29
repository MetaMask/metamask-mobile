import {
  BridgeFeatureFlagsKey,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';

export const mockChainId = '0x1' as Hex;
const ethChainId = '0x1' as Hex;
const optimismChainId = '0xa' as Hex;

// Ethereum tokens
export const ethToken1Address =
  '0x0000000000000000000000000000000000000001' as Hex;
export const ethToken2Address =
  '0x0000000000000000000000000000000000000002' as Hex;

// Optimism tokens
export const optimismToken1Address =
  '0x0000000000000000000000000000000000000003' as Hex;

export const defaultBridgeControllerState = {
  bridgeFeatureFlags: {
    [BridgeFeatureFlagsKey.MOBILE_CONFIG]: {
      chains: {
        [formatChainIdToCaip(ethChainId)]: {
          isActiveSrc: true,
          isActiveDest: true,
        },
        [formatChainIdToCaip(optimismChainId)]: {
          isActiveSrc: true,
          isActiveDest: true,
        },
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
