import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  BridgeQuoteDataProvider,
  useBridgeQuoteDataContext,
} from './BridgeQuoteDataContext';
import { runQuoteProviderCases } from './runQuoteProviderCases';
import { FeatureId } from '@metamask/bridge-controller';

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
  default: jest.fn(),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
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
  },
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  })),
}));

jest.mock('../useSwapsFeatureId', () => ({
  useSwapsFeatureId: jest.fn(),
}));

jest.mock('../useBridgeSession', () => ({
  useBridgeSession: jest.fn(),
}));

const Consumer = () => {
  useBridgeQuoteDataContext();
  return null;
};

runQuoteProviderCases({
  name: 'BridgeQuoteDataContext',
  missingProviderError:
    'useBridgeQuoteDataContext must be used within BridgeQuoteDataProvider and SwapQuotesProvider',
  renderProvider: (state) =>
    renderWithProvider(
      <BridgeQuoteDataProvider>
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
      </BridgeQuoteDataProvider>,
      { state },
    ),
  renderWithoutProvider: () => renderWithProvider(<Consumer />),
  featureId: FeatureId.UNIFIED_SWAP_BRIDGE,
  quoteParams: {},
});
