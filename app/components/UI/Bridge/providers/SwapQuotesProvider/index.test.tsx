import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SwapQuotesProvider } from '.';
import { useSwapQuotes } from '../../hooks/useSwapQuotes/index';
import { runQuoteProviderCases } from '../../hooks/useBridgeQuoteData/runQuoteProviderCases';
import { FeatureId } from '@metamask/bridge-controller';
import { mockContext } from '../../hooks/useBridgeQuoteRequest/runQuoteRequestCases';

jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(() => true),
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: jest.fn(),
  }),
}));

jest.mock('../../hooks/useUnifiedSwapBridgeContext', () => ({
  useUnifiedSwapBridgeContext: jest.fn(() => mockContext),
}));

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation((params) => jest.fn(params)),
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    validateBridgeTx: jest.fn(),
  })),
}));

jest.mock('../../hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useInsufficientNativeReserveError', () => ({
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

jest.mock('../../hooks/useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

jest.mock('../../hooks/useBridgeSession', () => ({
  useBridgeSession: jest.fn(),
}));

const Consumer = () => {
  useSwapQuotes();
  return null;
};

runQuoteProviderCases({
  name: 'SwapQuotesContext',
  missingProviderError: 'useSwapQuotes must be used within SwapQuotesProvider',
  featureId: FeatureId.LIMIT_ORDER,
  quoteParams: {
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
  },
  renderProvider: (state) =>
    renderWithProvider(
      <SwapQuotesProvider>
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
