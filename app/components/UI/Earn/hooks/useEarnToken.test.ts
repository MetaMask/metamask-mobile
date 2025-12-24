import {
  AccountTrackerControllerState,
  CurrencyRateState,
  TokensControllerState,
} from '@metamask/assets-controllers';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { act } from 'react';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import {
  internalAccount2,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../util/test/accountsControllerTestUtils';
import {
  MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
  MOCK_NETWORK_CONTROLLER_STATE,
  MOCK_KEYRING_CONTROLLER_STATE,
} from '../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  MOCK_LENDING_MARKET_USDC,
  MOCK_LENDING_MARKET_USDT,
  MOCK_LENDING_MARKET_WETH,
} from '../../Stake/__mocks__/earnControllerMockData';
import { mockEarnControllerRootState } from '../../Stake/testUtils';
import { TokenI } from '../../Tokens/types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import useEarnToken from './useEarnToken';

const MOCK_ROOT_STATE_WITH_EARN_CONTROLLER = mockEarnControllerRootState();
const MOCK_RATE = {
  price: 0.99,
  currency: 'ETH',
  allTimeHigh: 1,
  allTimeLow: 1,
  marketCap: 1,
  circulatingSupply: 1,
  dilutedMarketCap: 1,
  high1d: 1,
  low1d: 1,
  marketCapPercentChange1d: 0,
  priceChange1d: 0,
  pricePercentChange1d: 0,
  pricePercentChange1h: 0,
  pricePercentChange14d: 0,
  pricePercentChange30d: 0,
  pricePercentChange7d: 0,
  pricePercentChange200d: 0,
  pricePercentChange1y: 0,
  totalVolume: 1,
};

const mockState = {
  ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER,
  engine: {
    ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER.engine,
    backgroundState: {
      ...MOCK_ROOT_STATE_WITH_EARN_CONTROLLER.engine.backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      KeyringController: MOCK_KEYRING_CONTROLLER_STATE,
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          USD: {
            conversionDate: 1717334400000,
            conversionRate: 1,
            usdConversionRate: 1,
          },
          ETH: {
            conversionDate: 1717334400000,
            conversionRate: 1,
            usdConversionRate: 1,
          },
        },
      } as CurrencyRateState,
      AccountTrackerController: {
        accountsByChainId: {
          [CHAIN_IDS.MAINNET]: {
            [toChecksumHexAddress(internalAccount2.address)]: {
              balance: '0x15345543',
              stakedBalance: '0x1',
            },
          },
        },
      } as AccountTrackerControllerState,
      NetworkController: {
        ...MOCK_NETWORK_CONTROLLER_STATE,
        networkConfigurationsByChainId: {
          ...MOCK_NETWORK_CONTROLLER_STATE.networkConfigurationsByChainId,
          '0x1': {
            blockExplorerUrls: [],
            chainId: '0x1',
            defaultRpcEndpointIndex: 0,
            name: 'Mainnet',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                failoverUrls: [],
                networkClientId: 'mainnet',
                type: 'infura',
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
              },
            ],
          },
        },
      },
      TokensController: {
        allTokens: {
          [CHAIN_IDS.MAINNET as Hex]: {
            [internalAccount2.address as string]: [
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDT.underlying.address,
                ),
                name: 'USDT Token',
                symbol: 'USDT',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDC.underlying.address,
                ),
                name: 'USDC Token',
                symbol: 'USDC',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_WETH.underlying.address,
                ),
                name: 'WETH Token',
                symbol: 'WETH',
                decimals: 12,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDT.outputToken.address,
                ),
                name: 'aUSDT Token',
                symbol: 'aUSDT',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_USDC.outputToken.address,
                ),
                name: 'aUSDC Token',
                symbol: 'aUSDC',
                decimals: 6,
              },
              {
                address: toChecksumHexAddress(
                  MOCK_LENDING_MARKET_WETH.outputToken.address,
                ),
                name: 'aWETH Token',
                symbol: 'aWETH',
                decimals: 12,
              },
            ],
          },
        },
        allIgnoredTokens: {},
        allDetectedTokens: {},
      } as TokensControllerState,
      TokenBalancesController: {
        tokenBalances: {
          [internalAccount2.address as Hex]: {
            [CHAIN_IDS.MAINNET]: {
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDT.underlying.address,
              )]: '0x112379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDC.underlying.address,
              )]: '0x0',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_WETH.underlying.address,
              )]: '0x312379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDT.outputToken.address,
              )]: '0x412379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_USDC.outputToken.address,
              )]: '0x512379784235',
              [toChecksumHexAddress(
                MOCK_LENDING_MARKET_WETH.outputToken.address,
              )]: '0x612379784235',
            },
          },
        },
      },
      MultichainNetworkController: MOCK_MULTICHAIN_NETWORK_CONTROLLER_STATE,
      TokenRatesController: {
        marketData: {
          [CHAIN_IDS.MAINNET]: {
            [toChecksumHexAddress(MOCK_LENDING_MARKET_USDT.underlying.address)]:
              { ...MOCK_RATE, price: 0.000005123 },
            [toChecksumHexAddress(MOCK_LENDING_MARKET_USDC.underlying.address)]:
              { ...MOCK_RATE, price: 0.0000000123 },
            [toChecksumHexAddress(MOCK_LENDING_MARKET_WETH.underlying.address)]:
              { ...MOCK_RATE, price: 0.0000654123 },
            [toChecksumHexAddress(
              MOCK_LENDING_MARKET_USDT.outputToken.address,
            )]: { ...MOCK_RATE, price: 0.0000654123 },
            [toChecksumHexAddress(
              MOCK_LENDING_MARKET_USDC.outputToken.address,
            )]: { ...MOCK_RATE, price: 0.003654123 },
            [toChecksumHexAddress(
              MOCK_LENDING_MARKET_WETH.outputToken.address,
            )]: { ...MOCK_RATE, price: 0.00040123 },
          },
        },
      },
    },
  },
} as unknown as RootState;

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    TokenSearchDiscoveryDataController: {
      fetchTokenDisplayData: jest.fn(),
    },
  },
}));

describe('useEarnToken', () => {
  const mockAsset: TokenI = {
    address: '0x123',
    chainId: '1',
    symbol: 'TEST',
    decimals: 18,
    isETH: false,
    aggregators: [],
    image: '',
    name: 'Test Token',
    balance: '0',
    logo: '',
  };

  const mockEarnToken = {
    ...mockAsset,
    experience: {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: '5.0',
      estimatedAnnualRewardsFormatted: '1000000000000000000',
      estimatedAnnualRewardsFiatNumber: 1000000000000000000,
      estimatedAnnualRewardsTokenMinimalUnit: '1000000000000000000',
      estimatedAnnualRewardsTokenFormatted: '1000000000000000000',
      market: {
        protocol: LendingProtocol.AAVE,
        id: '1',
        address: '0x456',
        chainId: 1,
        name: 'Test Market',
        tvlUnderlying: '1000000000000000000',
        underlying: {
          address: '0x123',
          chainId: 1,
        },
        outputToken: {
          address: '0x789',
          chainId: 1,
        },
        rewards: [],
        position: {
          id: '1',
          assets: '1000000000000000000',
          chainId: 1,
          marketId: '1',
          marketAddress: '0x456',
          protocol: LendingProtocol.AAVE,
        },
        netSupplyRate: 0.05,
        totalSupplyRate: 0.05,
      },
    },
    ticker: 'TEST',
  } as unknown as EarnTokenDetails;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle token snapshot loading and data', async () => {
    (
      Engine.context.TokenSearchDiscoveryDataController
        .fetchTokenDisplayData as jest.Mock
    ).mockResolvedValueOnce(undefined);

    const { result } = renderHookWithProvider(() => useEarnToken(mockAsset), {
      state: mockState,
    });

    expect(result.current.isLoadingTokenSnapshot).toBe(false);
    expect(result.current.tokenSnapshot).toBeUndefined();

    await act(async () => {
      await result.current.getTokenSnapshot('0x1' as Hex, '0x123' as Hex);
    });

    expect(result.current.isLoadingTokenSnapshot).toBe(false);
    expect(result.current.errorTokenSnapshot).toBeNull();
  });

  it('should handle token snapshot error', async () => {
    const mockError = new Error('Failed to fetch token data');
    (
      Engine.context.TokenSearchDiscoveryDataController
        .fetchTokenDisplayData as jest.Mock
    ).mockRejectedValueOnce(mockError);

    const { result } = renderHookWithProvider(() => useEarnToken(mockAsset), {
      state: mockState,
    });

    await act(async () => {
      await result.current.getTokenSnapshot('0x1' as Hex, '0x123' as Hex);
    });

    expect(result.current.isLoadingTokenSnapshot).toBe(false);
    expect(result.current.errorTokenSnapshot).toBe(mockError);
  });

  it('should calculate estimated annual rewards', () => {
    const { result } = renderHookWithProvider(() => useEarnToken(mockAsset), {
      state: mockState,
    });

    const rewards = result.current.getEstimatedAnnualRewardsForAmount(
      mockEarnToken,
      '1000000000000000000',
      1.0,
    );

    expect(rewards).toBeDefined();
  });
});
