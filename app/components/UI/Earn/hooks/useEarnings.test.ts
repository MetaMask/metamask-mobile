import {
  renderHookWithProvider,
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { TokenI } from '../../Tokens/types';
import { EarnTokenDetails, LendingProtocol } from '../types/lending.types';
import useEarnings from './useEarnings';
import useBalance from '../../Stake/hooks/useBalance';
import usePooledStakes from '../../Stake/hooks/usePooledStakes';
import useEarnLendingPositions from './useEarnLendingPosition';
import { useEarnMetadata } from './useEarnMetadata';
import { earnSelectors } from '../../../../selectors/earnController/earn';
import BN4 from 'bnjs4';
import { MOCK_USDC_MAINNET_ASSET } from '../../Stake/__mocks__/stakeMockData';

// Mock dependencies
jest.mock('../../Stake/hooks/useBalance');
jest.mock('../../Stake/hooks/usePooledStakes');
jest.mock('./useEarnLendingPosition');
jest.mock('./useEarnMetadata');
jest.mock('../../../../selectors/earnController/earn');

const mockUseBalance = useBalance as jest.MockedFunction<typeof useBalance>;
const mockUsePooledStakes = usePooledStakes as jest.MockedFunction<
  typeof usePooledStakes
>;
const mockUseEarnLendingPositions =
  useEarnLendingPositions as jest.MockedFunction<
    typeof useEarnLendingPositions
  >;
const mockUseEarnMetadata = useEarnMetadata as jest.MockedFunction<
  typeof useEarnMetadata
>;

describe('useEarnings', () => {
  const mockAsset: TokenI = {
    address: '0x123',
    chainId: '1',
    decimals: 18,
    symbol: 'ETH',
    ticker: 'ETH',
    aggregators: [],
    image: '',
    name: 'Ethereum',
    balance: '1000000000000000000',
    logo: '',
    isETH: true,
  };

  const mockOutputToken: EarnTokenDetails = {
    address: '0x456',
    chainId: '1',
    decimals: 18,
    symbol: 'stETH',
    ticker: 'stETH',
    aggregators: [],
    image: '',
    name: 'Staked ETH',
    balance: '0',
    logo: '',
    isETH: false,
    balanceFormatted: '0',
    balanceMinimalUnit: '0',
    balanceFiatNumber: 0,
    tokenUsdExchangeRate: 2000,
    experiences: [],
    experience: {
      type: EARN_EXPERIENCES.POOLED_STAKING,
      apr: '5.0',
      estimatedAnnualRewardsFormatted: '50.0 ETH',
      estimatedAnnualRewardsFiatNumber: 100000,
      estimatedAnnualRewardsTokenMinimalUnit: '50000000000000000000',
      estimatedAnnualRewardsTokenFormatted: '50.0 ETH',
    },
  };

  const mockState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...backgroundState,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: mockOutputToken,
      },
    );

    mockUseBalance.mockReturnValue({
      balanceETH: '1',
      balanceFiat: '$2000',
      balanceWei: new BN4('1000000000000000000'),
      balanceFiatNumber: 2000,
      stakedBalanceWei: new BN4('0').toString(),
      formattedStakedBalanceETH: '0',
      stakedBalanceFiatNumber: 0,
      formattedStakedBalanceFiat: '$0',
      conversionRate: 2000,
      currentCurrency: 'USD',
    });

    mockUsePooledStakes.mockReturnValue({
      pooledStakesData: {
        account: '0x123',
        lifetimeRewards: '100000000000000000000', // 100 ETH
        assets: '1000000000000000000000', // 1000 ETH
        exitRequests: [],
      },
      isLoadingPooledStakesData: false,
      hasStakedPositions: true,
      hasRewards: true,
      hasRewardsOnly: false,
      hasNeverStaked: false,
      hasEthToUnstake: true,
      exchangeRate: '1',
      error: null,
      refreshPooledStakes: jest.fn(),
    });

    mockUseEarnLendingPositions.mockReturnValue({
      hasEarnLendingPositions: false,
      earnLendingPositions: undefined,
      exchangeRate: undefined,
      isLoadingEarnLendingPositions: false,
      error: null,
      lifetimeRewards: '0',
      refreshEarnLendingPositions: jest.fn(),
    });

    mockUseEarnMetadata.mockReturnValue({
      annualRewardRate: '5.0%',
      annualRewardRateDecimal: 0.05,
      annualRewardRateValue: 5,
      isLoadingEarnMetadata: false,
    });
  });

  it('should return correct earnings data for pooled staking', () => {
    const { result } = renderHookWithProvider(
      () => useEarnings({ asset: mockAsset }),
      {
        state: mockState,
      },
    );

    expect(result.current).toEqual({
      annualRewardRate: '5.0%',
      lifetimeRewards: '100 ETH',
      lifetimeRewardsFiat: '200000 USD',
      estimatedAnnualEarnings: '50 ETH',
      estimatedAnnualEarningsFiat: '100000 USD',
      isLoadingEarningsData: false,
      hasEarnPooledStakes: true,
      hasEarnLendingPositions: false,
      hasEarnings: true,
    });
  });

  it('should return correct earnings data for stablecoin lending', () => {
    const mockLendingOutputToken: EarnTokenDetails = {
      ...mockOutputToken,
      balanceMinimalUnit: '1000000',
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
      experiences: [
        {
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
      ],
    };

    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: mockLendingOutputToken,
      },
    );

    mockUseEarnLendingPositions.mockReturnValue({
      hasEarnLendingPositions: true,
      earnLendingPositions: undefined,
      exchangeRate: undefined,
      isLoadingEarnLendingPositions: false,
      error: null,
      lifetimeRewards: '100000000', // 100 USDC
      refreshEarnLendingPositions: jest.fn(),
    });

    const { result } = renderHookWithProvider(
      () => useEarnings({ asset: mockAsset }),
      {
        state: mockState,
      },
    );

    expect(result.current).toEqual({
      annualRewardRate: '5.0%',
      lifetimeRewards: '< 0.00001 stETH',
      lifetimeRewardsFiat: '0 USD',
      estimatedAnnualEarnings: '< 0.00001 stETH',
      estimatedAnnualEarningsFiat: '0 USD',
      isLoadingEarningsData: false,
      hasEarnPooledStakes: true,
      hasEarnLendingPositions: true,
      hasEarnings: true,
    });
  });

  it('should handle loading state correctly', () => {
    mockUsePooledStakes.mockReturnValue({
      pooledStakesData: {
        account: '0x123',
        lifetimeRewards: '0',
        assets: '0',
        exitRequests: [],
      },
      isLoadingPooledStakesData: true,
      hasStakedPositions: false,
      hasRewards: false,
      hasRewardsOnly: false,
      hasNeverStaked: true,
      hasEthToUnstake: false,
      exchangeRate: '1',
      error: null,
      refreshPooledStakes: jest.fn(),
    });

    mockUseEarnMetadata.mockReturnValue({
      annualRewardRate: '5.0%',
      annualRewardRateDecimal: 0.05,
      annualRewardRateValue: 5,
      isLoadingEarnMetadata: true,
    });

    const { result } = renderHookWithProvider(
      () => useEarnings({ asset: mockAsset }),
      {
        state: mockState,
      },
    );

    expect(result.current.isLoadingEarningsData).toBe(true);
  });

  it('should handle no earnings correctly', () => {
    mockUsePooledStakes.mockReturnValue({
      pooledStakesData: {
        account: '0x123',
        lifetimeRewards: '0',
        assets: '0',
        exitRequests: [],
      },
      isLoadingPooledStakesData: false,
      hasStakedPositions: false,
      hasRewards: false,
      hasRewardsOnly: false,
      hasNeverStaked: true,
      hasEthToUnstake: false,
      exchangeRate: '1',
      error: null,
      refreshPooledStakes: jest.fn(),
    });

    mockUseEarnLendingPositions.mockReturnValue({
      hasEarnLendingPositions: false,
      earnLendingPositions: undefined,
      exchangeRate: undefined,
      isLoadingEarnLendingPositions: false,
      error: null,
      lifetimeRewards: '0',
      refreshEarnLendingPositions: jest.fn(),
    });

    const { result } = renderHookWithProvider(
      () => useEarnings({ asset: mockAsset }),
      {
        state: mockState,
      },
    );

    expect(result.current).toEqual({
      annualRewardRate: '5.0%',
      lifetimeRewards: '0 ETH',
      lifetimeRewardsFiat: '0 USD',
      estimatedAnnualEarnings: '0 ETH',
      estimatedAnnualEarningsFiat: '0 USD',
      isLoadingEarningsData: false,
      hasEarnPooledStakes: false,
      hasEarnLendingPositions: false,
      hasEarnings: false,
    });
  });

  it('should handle missing output token', () => {
    (earnSelectors.selectEarnTokenPair as unknown as jest.Mock).mockReturnValue(
      {
        outputToken: null,
      },
    );

    const { result } = renderHookWithProvider(
      () => useEarnings({ asset: mockAsset }),
      {
        state: mockState,
      },
    );

    expect(result.current).toEqual({
      annualRewardRate: '5.0%',
      lifetimeRewards: '',
      lifetimeRewardsFiat: '',
      estimatedAnnualEarnings: '',
      estimatedAnnualEarningsFiat: '',
      isLoadingEarningsData: false,
      hasEarnPooledStakes: true,
      hasEarnLendingPositions: false,
      hasEarnings: true,
    });
  });
});
