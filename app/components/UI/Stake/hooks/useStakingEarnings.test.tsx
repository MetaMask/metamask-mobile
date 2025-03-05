import { waitFor } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import useStakingEarnings from './useStakingEarnings';
import usePooledStakes from './usePooledStakes';
import useBalance from './useBalance';
import useVaultApyAverages from './useVaultApyAverages';
import { MOCK_VAULT_APY_AVERAGES } from '../components/PoolStakingLearnMoreModal/mockVaultRewards';

// Mock dependencies
jest.mock('./usePooledStakes');
jest.mock('./useBalance');
jest.mock('./useVaultApyAverages');

describe('useStakingEarnings', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and calculates staking earnings data correctly', async () => {
    // Mock return values for useVaultApyAverages, useBalance, and usePooledStakes
    (useVaultApyAverages as jest.Mock).mockReturnValue({
      vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
      isLoadingVaultApyAverages: false,
      refreshVaultApyAverages: jest.fn(),
    });

    (useBalance as jest.Mock).mockReturnValue({
      currentCurrency: 'usd',
      conversionRate: 3000,
    });

    (usePooledStakes as jest.Mock).mockReturnValue({
      pooledStakesData: {
        lifetimeRewards: '5000000000000000000', // 5 ETH in wei
        assets: '10000000000000000000', // 10 ETH in wei
      },
      isLoadingPooledStakesData: false,
    });

    const { result } = renderHook(() => useStakingEarnings());

    // Wait for state updates
    await waitFor(() => {
      expect(result.current.isLoadingEarningsData).toBe(false);
      expect(result.current.annualRewardRate).toBe('3.3%');
      expect(result.current.lifetimeRewardsETH).toBe('5 ETH'); // Calculated by renderFromWei
      expect(result.current.lifetimeRewardsFiat).toBe('$15000'); // 5 ETH * 3000 USD/ETH
      expect(result.current.estimatedAnnualEarningsETH).toBe('0.32576 ETH'); // Calculated based on assets and annualRewardRateDecimal
      expect(result.current.estimatedAnnualEarningsFiat).toBe('$977.27'); // No earnings in fiat
    });
  });

  it('returns loading state when either vault or pooled stakes data is loading', async () => {
    (useVaultApyAverages as jest.Mock).mockReturnValue({
      vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
      isLoadingVaultApyAverages: true, // Simulate loading
      refreshVaultApyAverages: jest.fn(),
    });

    (usePooledStakes as jest.Mock).mockReturnValue({
      pooledStakesData: {},
      isLoadingPooledStakesData: false,
    });

    const { result } = renderHook(() => useStakingEarnings());

    // Wait for state updates
    await waitFor(() => {
      expect(result.current.isLoadingEarningsData).toBe(true); // Should still be loading
    });
  });

  it('handles absence of pooled stakes data correctly', async () => {
    (useVaultApyAverages as jest.Mock).mockReturnValue({
      vaultApyAverages: MOCK_VAULT_APY_AVERAGES,
      isLoadingVaultApyAverages: false,
      refreshVaultApyAverages: jest.fn(),
    });

    (useBalance as jest.Mock).mockReturnValue({
      currentCurrency: 'usd',
      conversionRate: 3000,
    });

    // Simulate missing pooled stakes data
    (usePooledStakes as jest.Mock).mockReturnValue({
      pooledStakesData: {},
      isLoadingPooledStakesData: false,
    });

    const { result } = renderHook(() => useStakingEarnings());

    await waitFor(() => {
      expect(result.current.lifetimeRewardsETH).toBe('0 ETH'); // No lifetime rewards
      expect(result.current.lifetimeRewardsFiat).toBe('$0'); // No fiat equivalent
      expect(result.current.estimatedAnnualEarningsETH).toBe('0 ETH'); // No estimated earnings
      expect(result.current.estimatedAnnualEarningsFiat).toBe('$0'); // No fiat earnings
    });
  });
});
