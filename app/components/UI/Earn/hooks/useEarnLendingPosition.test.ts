import { LendingProtocol } from '@metamask/stake-sdk';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddress,
} from '../../../../selectors/accountsController';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { selectAllTokens } from '../../../../selectors/tokensController';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { MOCK_USDC_MAINNET_ASSET } from '../../Stake/__mocks__/stakeMockData';
import { TokenI } from '../../Tokens/types';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';
import useEarnLendingPositions from './useEarnLendingPosition';
import { act } from 'react';

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      getLendingPositionHistory: jest.fn(),
    },
  },
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
  selectSelectedInternalAccountAddress: jest.fn(),
}));

jest.mock('../../../../selectors/earnController/earn', () => ({
  earnSelectors: {
    selectEarnTokenPair: jest.fn(),
  },
}));

// Mock other selectors that might be used
jest.mock('../../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(),
  selectAllTokens: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  ...jest.requireActual('../../../../selectors/currencyRateController'),
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  ...jest.requireActual('../../../../selectors/tokenRatesController'),
  selectSingleTokenPriceMarketData: jest.fn(),
}));

jest.mock('../../../../selectors/transactionController', () => ({
  ...jest.requireActual('../../../../selectors/transactionController'),
}));

jest.mock('../../../../selectors/smartTransactionsController', () => ({
  selectSmartTransactionsEnabled: jest.fn().mockReturnValue(true),
  selectPendingSmartTransactionsBySender: jest.fn().mockReturnValue([]),
}));

jest.mock('../../../../core/redux/slices/bridge', () => ({
  selectAllBridgeableNetworks: jest.fn().mockReturnValue([]),
}));

describe('useEarnLendingPositions', () => {
  const mockAsset: TokenI = {
    address: '0x123',
    chainId: '0x1',
    symbol: 'USDC',
    decimals: 6,
    isETH: false,
    aggregators: [],
    image: '',
    name: 'USD Coin',
    balance: '0',
    logo: '',
  };

  const mockState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        EarnController: {
          lending: {
            markets: [],
            positions: [],
            isEligible: true,
          },
        },
        TokensController: {
          allTokens: {
            '0x1': {
              '0x456': [
                {
                  address: '0x123',
                  symbol: 'USDC',
                },
              ],
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            USD: {
              conversionDate: Date.now(),
              conversionRate: 1,
              usdConversionRate: 1,
            },
          },
        },
        TokenRatesController: {
          marketData: {
            '0x1': {
              '0x123': {
                tokenAddress: '0x123',
                currency: 'USD',
                price: 1,
              },
            },
          },
        },
      },
    },
  };

  const mockSelectedAccount = {
    address: '0x456',
  };

  const mockLendingOutputToken: EarnTokenDetails = {
    address: '0x789',
    chainId: '0x1',
    symbol: 'aUSDC',
    decimals: 6,
    isETH: false,
    aggregators: [],
    image: '',
    name: 'Aave USDC',
    balance: '0',
    logo: '',
    balanceFormatted: '0',
    balanceMinimalUnit: '0',
    balanceFiatNumber: 0,
    tokenUsdExchangeRate: 1,
    experience: {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: '4.5',
      estimatedAnnualRewardsFormatted: '5',
      estimatedAnnualRewardsFiatNumber: 4.5,
      estimatedAnnualRewardsTokenMinimalUnit: '4500000',
      estimatedAnnualRewardsTokenFormatted: '4.50 USDC',
      market: {
        id: '0x123',
        chainId: 1,
        protocol: LendingProtocol.AAVE,
        name: 'USDC Market',
        address: '0x123',
        netSupplyRate: 4.5,
        totalSupplyRate: 4.5,
        rewards: [],
        tvlUnderlying: '1000000',
        underlying: {
          address: MOCK_USDC_MAINNET_ASSET.address,
          chainId: 1,
        },
        outputToken: {
          address: '0x456',
          chainId: 1,
        },
        position: {
          id: '0x123-0x456-COLLATERAL-0',
          chainId: 1,
          assets: '1000000',
          marketId: '0x123',
          marketAddress: '0x123',
          protocol: LendingProtocol.AAVE,
        },
      },
    },
    experiences: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: mockLendingOutputToken,
      },
    );
    (selectSelectedInternalAccount as unknown as jest.Mock).mockReturnValue(
      mockSelectedAccount,
    );
    (
      selectSelectedInternalAccountAddress as unknown as jest.Mock
    ).mockReturnValue(mockSelectedAccount.address);
    (selectAllTokens as unknown as jest.Mock).mockReturnValue([mockAsset]);
  });

  it('should return initial state when no output token is available', () => {
    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: null,
      },
    );

    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    expect(result.current).toEqual({
      earnLendingPositions: undefined,
      exchangeRate: undefined,
      isLoadingEarnLendingPositions: false,
      error: null,
      hasEarnLendingPositions: false,
      refreshEarnLendingPositions: expect.any(Function),
      lifetimeRewards: '0',
    });
  });

  it('should fetch lending position history and update state', async () => {
    const mockLendingPositionHistory = {
      lifetimeRewards: [
        {
          assets: '1000000',
          token: {
            address: MOCK_USDC_MAINNET_ASSET.address,
          },
        },
      ],
      assets: '1000000',
    };

    (
      Engine.context.EarnController.getLendingPositionHistory as jest.Mock
    ).mockResolvedValue(mockLendingPositionHistory);

    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    // Wait for the effect to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current).toEqual({
      earnLendingPositions: mockLendingOutputToken.experience.market?.position,
      exchangeRate: 1,
      isLoadingEarnLendingPositions: true,
      error: null,
      hasEarnLendingPositions: false,
      refreshEarnLendingPositions: expect.any(Function),
      lifetimeRewards: '0',
    });
  });

  it('should handle error when fetching lending position history fails', async () => {
    const error = new Error('Failed to fetch lending position history');
    (
      Engine.context.EarnController.getLendingPositionHistory as jest.Mock
    ).mockRejectedValue(error);

    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    // Wait for the effect to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current).toEqual({
      earnLendingPositions: mockLendingOutputToken.experience.market?.position,
      exchangeRate: 1,
      isLoadingEarnLendingPositions: true,
      error: null,
      hasEarnLendingPositions: false,
      refreshEarnLendingPositions: expect.any(Function),
      lifetimeRewards: '0',
    });
  });

  it('should not fetch lending position history when required data is missing', () => {
    const mockIncompleteOutputToken = {
      ...mockLendingOutputToken,
      experience: {
        ...mockLendingOutputToken.experience,
        market: {
          ...mockLendingOutputToken.experience.market,
          position: undefined,
        },
      },
    };

    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: mockIncompleteOutputToken,
      },
    );

    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    expect(
      Engine.context.EarnController.getLendingPositionHistory,
    ).not.toHaveBeenCalled();
    expect(result.current.hasEarnLendingPositions).toBe(false);
  });

  it('should refresh lending position history when refreshEarnLendingPositions is called', async () => {
    const mockLendingPositionHistory = {
      lifetimeRewards: [
        {
          assets: '2000000',
          token: {
            address: MOCK_USDC_MAINNET_ASSET.address,
          },
        },
      ],
      assets: '2000000',
    };

    (Engine.context.EarnController.getLendingPositionHistory as jest.Mock)
      .mockResolvedValueOnce({
        lifetimeRewards: [
          {
            assets: '1000000',
            token: {
              address: MOCK_USDC_MAINNET_ASSET.address,
            },
          },
        ],
        assets: '1000000',
      })
      .mockResolvedValueOnce(mockLendingPositionHistory);

    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    await act(async () => {
      // Wait for the initial effect to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.lifetimeRewards).toBe('1000000');

    await act(async () => {
      await result.current.refreshEarnLendingPositions();
    });

    expect(result.current.lifetimeRewards).toBe('2000000');
  });
});
