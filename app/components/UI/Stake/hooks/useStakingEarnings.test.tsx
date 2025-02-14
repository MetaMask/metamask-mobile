import { waitFor } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import useStakingEarnings from './useStakingEarnings';
import usePooledStakes from './usePooledStakes';
import useVaultData from './useVaultData';
import useBalance from './useBalance';

// Mock dependencies
jest.mock('./usePooledStakes');
jest.mock('./useVaultData');
jest.mock('./useBalance');

describe('useStakingEarnings', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and calculates staking earnings data correctly', async () => {
    // Mock return values for useVaultData, useBalance, and usePooledStakes
    (useVaultData as jest.Mock).mockReturnValue({
      annualRewardRate: '2.5%',
      annualRewardRateDecimal: 0.025,
      isLoadingVaultData: false,
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
      expect(result.current.annualRewardRate).toBe('2.5%');
      expect(result.current.lifetimeRewardsETH).toBe('5 ETH'); // Calculated by renderFromWei
      expect(result.current.lifetimeRewardsFiat).toBe('$15000'); // 5 ETH * 3000 USD/ETH
      expect(result.current.estimatedAnnualEarningsETH).toBe('0.25 ETH'); // Calculated based on assets and annualRewardRateDecimal
      expect(result.current.estimatedAnnualEarningsFiat).toBe('$750'); // No earnings in fiat
    });
  });

  it('returns loading state when either vault or pooled stakes data is loading', async () => {
    // Mock return values for useVaultData and usePooledStakes
    (useVaultData as jest.Mock).mockReturnValue({
      annualRewardRate: '2.5%',
      annualRewardRateDecimal: 0.025,
      isLoadingVaultData: true, // Simulate loading
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
    // Mock return values for useVaultData, useBalance, and usePooledStakes
    (useVaultData as jest.Mock).mockReturnValue({
      annualRewardRate: '2.5%',
      annualRewardRateDecimal: 0.025,
      isLoadingVaultData: false,
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
