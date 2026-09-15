import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { SwapQuotesProvider } from '.';
import { useSwapQuotes } from '../../hooks/useSwapQuotes/index';
import { runQuoteProviderCases } from '../../hooks/useBridgeQuoteData/runQuoteProviderCases';
import { FeatureId } from '@metamask/bridge-controller';
import { mockContext } from '../../hooks/useBridgeQuoteRequest/runQuoteRequestCases';

// `@metamask/bridge-controller` is ESM-only; Babel compiles its re-exports to
// non-configurable getters that `jest.spyOn` cannot redefine. Re-exporting the
// real module through a plain object restores spy-able properties for the
// `selectBridgeQuotes` / `selectBridgeFeatureFlags` spies in the shared cases.
jest.mock('@metamask/bridge-controller', () => ({
  // `__esModule` keeps Babel's interop from wrapping this object in a copy,
  // so the namespace the spies patch is the one consumers read from.
  __esModule: true,
  ...jest.requireActual('@metamask/bridge-controller'),
}));

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
        isActive
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
