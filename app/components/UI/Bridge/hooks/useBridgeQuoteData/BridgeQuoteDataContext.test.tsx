import React from 'react';
import { BigNumber } from 'ethers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { BridgeToken } from '../../types';
import {
  BridgeQuoteDataProvider,
  useBridgeQuoteDataContext,
} from './BridgeQuoteDataContext';
import { runQuoteProviderCases } from './runQuoteProviderCases';

jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(() => true),
}));

const mockValidateBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: mockValidateBridgeTx,
  }),
}));

const mockUseIsInsufficientBalance = jest.fn();
jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: (params: {
    amount?: string;
    token?: BridgeToken;
    latestAtomicBalance?: BigNumber;
    ignoreGasFees?: boolean;
  }) => mockUseIsInsufficientBalance(params),
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

const Consumer = () => {
  useBridgeQuoteDataContext();
  return null;
};

runQuoteProviderCases({
  mockValidateBridgeTx,
  mockUseIsInsufficientBalance,
  missingProviderError:
    'useBridgeQuoteDataContext must be used within BridgeQuoteDataProvider',
  renderProvider: (state) =>
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
    ),
  renderWithoutProvider: () => renderWithProvider(<Consumer />),
});
