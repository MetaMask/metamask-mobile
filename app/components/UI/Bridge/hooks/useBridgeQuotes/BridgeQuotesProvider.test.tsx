import React from 'react';
import { BigNumber } from 'ethers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  BridgeQuotesProvider,
  useBridgeQuotesContext,
} from './BridgeQuotesProvider';
import {
  mockUseIsInsufficientBalance,
  mockValidateBridgeTx,
  runQuoteProviderCases,
} from '../quoteTestCases/runQuoteProviderCases';
import { configFromBridgeState } from '../quoteTestCases/configFromBridgeState';

jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(() => true),
}));

jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: mockValidateBridgeTx,
  }),
}));

jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: (params: unknown) => mockUseIsInsufficientBalance(params),
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
      updateBridgeQuoteRequestParams: jest.fn().mockResolvedValue(undefined),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0x1234567890123456789012345678901234567890'],
            type: 'HD Key Tree',
            metadata: {
              id: '01JKZ55Y6KPCYH08M6B9VSZWKW',
              name: '',
            },
          },
        ],
      },
    },
  },
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  })),
}));

function Consumer() {
  useBridgeQuotesContext();
  return null;
}

runQuoteProviderCases({
  missingProviderError:
    'useBridgeQuotesContext must be used within BridgeQuotesProvider',
  renderWithConsumers: (state) => {
    renderWithProvider(
      <BridgeQuotesProvider
        config={configFromBridgeState(state as never, {
          latestSourceAtomicBalance: BigNumber.from('1000000000'),
        })}
      >
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
      </BridgeQuotesProvider>,
      { state },
    );
  },
  renderOutsideProvider: () => {
    renderWithProvider(<Consumer />);
  },
});
