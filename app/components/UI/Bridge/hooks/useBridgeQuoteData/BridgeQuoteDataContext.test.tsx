import React from 'react';
import { BigNumber } from 'ethers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  BridgeQuoteDataProvider,
  useBridgeQuoteDataContext,
} from './BridgeQuoteDataContext';
import {
  mockUseIsInsufficientBalance,
  mockValidateBridgeTx,
  runQuoteProviderCases,
} from '../quoteTestCaseRunners/runQuoteProviderCases';

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
  },
}));

jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  })),
}));

function Consumer() {
  useBridgeQuoteDataContext();
  return null;
}

runQuoteProviderCases({
  missingProviderError:
    'useBridgeQuoteDataContext must be used within BridgeQuoteDataProvider',
  renderWithConsumers: (state) => {
    renderWithProvider(
      <BridgeQuoteDataProvider
        latestSourceAtomicBalance={BigNumber.from('1000000000')}
      >
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
        <Consumer />
      </BridgeQuoteDataProvider>,
      { state },
    );
  },
  renderOutsideProvider: () => {
    renderWithProvider(<Consumer />);
  },
});
