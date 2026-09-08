import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SwapQuotesProvider } from './SwapQuotesContext';
import { useSwapQuotes } from './index';
import { runQuoteProviderCases } from '../useBridgeQuoteData/runQuoteProviderCases';
import { FeatureId } from '@metamask/bridge-controller';
import { mockContext } from '../useBridgeQuoteRequest/runQuoteRequestCases';

jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(() => true),
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: jest.fn(),
  }),
}));

jest.mock('../useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(() => mockContext),
}));

jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation((params) => jest.fn(params)),
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    validateBridgeTx: jest.fn(),
  })),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../useInsufficientNativeReserveError', () => ({
  useInsufficientNativeReserveError: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      getNetworkClientById: jest.fn(() => ({
        configuration: {
          chainId: '0x1',
        },
      })),
    },
    BridgeController: {
      updateBridgeQuoteRequestParams: jest.fn(),
    },
  },
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const Consumer = () => {
  useSwapQuotes();
  return null;
};

runQuoteProviderCases({
  name: 'SwapQuotesContext',
  missingProviderError: 'useSwapQuotes must be used within SwapQuotesProvider',
  renderProvider: (state) =>
    renderWithProvider(
      <SwapQuotesProvider
        featureId={FeatureId.UNIFIED_SWAP_BRIDGE}
        debounceWait={1000}
        quoteParams={{
          srcAmount: '1000000000',
          srcToken: {
            chainId: '0x1',
            address: '0x1',
            decimals: 18,
            symbol: 'USDC',
            name: 'USDC',
          },
          destToken: {
            chainId: '0x1',
            address: '0x2',
            decimals: 18,
            symbol: 'USDC',
            name: 'USDC',
          },
          walletAddress: '0x1',
          destWalletAddress: '0x2',
        }}
      >
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
      </SwapQuotesProvider>,
      { state },
    ),
  renderWithoutProvider: () => renderWithProvider(<Consumer />),
});
