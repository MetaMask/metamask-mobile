import React from 'react';
import { waitFor } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import { SolScope } from '@metamask/keyring-api';
import {
  selectBridgeQuotes,
  selectBridgeFeatureFlags,
} from '@metamask/bridge-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import {
  BridgeQuoteDataProvider,
  useBridgeQuoteDataContext,
} from './BridgeQuoteDataContext';
import { createBridgeTestState } from '../../testUtils';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import {
  getQuoteRefreshRate,
  isQuoteExpired,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';

jest.mock('../../utils/quoteUtils', () => ({
  isQuoteExpired: jest.fn(),
  getQuoteRefreshRate: jest.fn(),
  shouldRefreshQuote: jest.fn(),
}));

jest.mock(
  '../../../../../core/redux/slices/bridge/utils/hasMinimumRequiredVersion',
  () => ({
    hasMinimumRequiredVersion: jest.fn(() => true),
  }),
);

jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    selectBridgeQuotes: jest.fn(),
    selectBridgeFeatureFlags: jest.fn().mockImplementation(() => ({
      minimumVersion: '7.58.0',
      priceImpactThreshold: {
        gasless: 0.4,
        normal: 0.19,
        warning: 0.05,
        error: 0.25,
      },
    })),
  };
});

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

describe('BridgeQuoteDataContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isQuoteExpired as jest.Mock).mockReturnValue(false);
    (getQuoteRefreshRate as jest.Mock).mockReturnValue(5000);
    (shouldRefreshQuote as jest.Mock).mockReturnValue(false);
    mockUseIsInsufficientBalance.mockReturnValue(false);
    mockValidateBridgeTx.mockResolvedValue({ status: 'SUCCESS' });
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuoteWithMetadata,
      sortedQuotes: [mockQuoteWithMetadata],
    }));
    (selectBridgeFeatureFlags as unknown as jest.Mock).mockImplementation(
      () => ({
        minimumVersion: '7.58.0',
        priceImpactThreshold: {
          gasless: 0.4,
          normal: 0.19,
          warning: 0.05,
          error: 0.25,
        },
      }),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares one bridge quote data instance across multiple consumers', async () => {
    jest.spyOn(console, 'warn').mockImplementation();

    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceAmount: '0.5',
        sourceToken: {
          symbol: 'SOL',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111111',
          decimals: 9,
        },
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      },
    });

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
      { state: testState },
    );

    await waitFor(() => {
      expect(mockValidateBridgeTx).toHaveBeenCalledTimes(1);
    });
  });

  it('throws when used outside BridgeQuoteDataProvider', () => {
    jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderWithProvider(<Consumer />);
    }).toThrow(
      'useBridgeQuoteDataContext must be used within BridgeQuoteDataProvider',
    );
  });
});
