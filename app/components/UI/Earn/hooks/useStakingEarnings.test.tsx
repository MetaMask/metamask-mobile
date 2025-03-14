import { waitFor } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import useStakingEarnings from './useStakingEarnings';
import usePooledStakes from './usePooledStakes';
import useBalance from './useBalance';
import useVaultMetadata from './useVaultMetadata';
import { MOCK_VAULT_DATA } from '../__mocks__/earnControllerMockData';

// Mock dependencies
jest.mock('./usePooledStakes');
jest.mock('./useBalance');
jest.mock('./useVaultMetadata');

describe('useStakingEarnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and calculates staking earnings data correctly', async () => {
    (useVaultMetadata as jest.Mock).mockReturnValue({
      vaultMetadata: MOCK_VAULT_DATA,
      isLoadingVaultMetadata: false,
      error: '',
      annualRewardRate: '3.3%',
      annualRewardRateDecimal: 0.032345,
      refreshVaultMetadata: jest.fn(),
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
      expect(result.current.lifetimeRewardsETH).toBe('5 ETH');
      expect(result.current.lifetimeRewardsFiat).toBe('$15000');
      expect(result.current.estimatedAnnualEarningsETH).toBe('0.32345 ETH');
      expect(result.current.estimatedAnnualEarningsFiat).toBe('$970.35');
    });
  });

  it('returns loading state when either vault or pooled stakes data is loading', async () => {
    (useVaultMetadata as jest.Mock).mockReturnValue({
      vaultMetadata: MOCK_VAULT_DATA,
      isLoadingVaultMetadata: true,
      error: '',
      annualRewardRate: '0%',
      annualRewardRateDecimal: 0,
      refreshVaultMetadata: jest.fn(),
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

  it('handles default pooled stakes data correctly', async () => {
    (useVaultMetadata as jest.Mock).mockReturnValue({
      vaultMetadata: MOCK_VAULT_DATA,
      isLoadingVaultMetadata: true,
      error: '',
      annualRewardRate: '0%',
      annualRewardRateDecimal: 0,
      refreshVaultMetadata: jest.fn(),
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

  it('handles default vault metadata correctly', async () => {
    (useVaultMetadata as jest.Mock).mockReturnValue({
      vaultMetadata: MOCK_VAULT_DATA,
      isLoadingVaultMetadata: false,
      error: '',
      annualRewardRate: '3.3%',
      annualRewardRateDecimal: 0.032345,
      refreshVaultMetadata: jest.fn(),
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
