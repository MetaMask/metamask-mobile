import { act } from 'react';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import { selectAllTokens } from '../../../../selectors/tokensController';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { MOCK_USDC_MAINNET_ASSET } from '../../Stake/__mocks__/stakeMockData';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import useEarnLendingPositions from './useEarnLendingPosition';

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      getLendingPositionHistory: jest.fn(),
    },
  },
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0x456',
  })),
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
  const mockAsset = {
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
    balanceMinimalUnit: '4',
  } as unknown as EarnTokenDetails;

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

  it('should set hasEarnLendingPositions to true when position assets are greater than 0', async () => {
    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: {
          ...mockLendingOutputToken,
          balanceMinimalUnit: '100000',
        },
      },
    );
    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toEqual({
      earnLendingPositions: mockLendingOutputToken.experience.market?.position,
      exchangeRate: 1,
      isLoadingEarnLendingPositions: false,
      error: null,
      hasEarnLendingPositions: true,
      refreshEarnLendingPositions: expect.any(Function),
      lifetimeRewards: '0',
    });
  });

  it('should set hasEarnLendingPositions to false when position assets are 0', async () => {
    const mockOutputTokenWithZeroAssets = {
      ...mockLendingOutputToken,
      experience: {
        ...mockLendingOutputToken.experience,
        market: {
          ...mockLendingOutputToken.experience.market,
          position: {
            ...mockLendingOutputToken.experience?.market?.position,
            assets: '0',
          },
        },
      },
    };

    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: mockOutputTokenWithZeroAssets,
      },
    );

    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current).toEqual({
      earnLendingPositions:
        mockOutputTokenWithZeroAssets.experience.market?.position,
      exchangeRate: 1,
      isLoadingEarnLendingPositions: false,
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

  it('should refresh lending position data when refreshEarnLendingPositions is called', async () => {
    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: {
          ...mockLendingOutputToken,
          balanceMinimalUnit: '100000',
        },
      },
    );
    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.hasEarnLendingPositions).toBe(true);

    // Update the mock to simulate different position assets
    const mockOutputTokenWithDifferentAssets = {
      ...mockLendingOutputToken,
      experience: {
        ...mockLendingOutputToken.experience,
        market: {
          ...mockLendingOutputToken.experience.market,
          position: {
            ...mockLendingOutputToken.experience?.market?.position,
            assets: '0',
          },
        },
      },
    };

    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: mockOutputTokenWithDifferentAssets,
      },
    );

    await act(async () => {
      await result.current.refreshEarnLendingPositions();
    });

    // The hook should re-evaluate based on the new position assets
    expect(result.current.hasEarnLendingPositions).toBe(false);
  });

  it('should always return lifetimeRewards as 0 since the API call is commented out', async () => {
    const { result } = renderHookWithProvider(
      () => useEarnLendingPositions(mockAsset),
      {
        state: mockState,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.lifetimeRewards).toBe('0');
  });
});
