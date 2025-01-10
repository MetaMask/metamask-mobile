import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useVaultApys from './useVaultApys';
import { MOCK_VAULT_DAILY_APYS } from '../components/PoolStakingLearnMoreModal/mockVaultRewards';
import { act, waitFor } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { StakingApiService } from '@metamask/stake-sdk';
import { Stake } from '../sdk/stakeSdkProvider';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const mockStakingApiService: Partial<StakingApiService> = {
  getVaultDailyApys: jest.fn(),
};

const mockSdkContext: Stake = {
  stakingApiService: mockStakingApiService as StakingApiService,
  setSdkType: jest.fn(),
};

jest.mock('./useStakeContext', () => ({
  useStakeContext: () => mockSdkContext as Stake,
}));

describe('useVaultApys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching vaultApys', () => {
    it('fetches vaultApys and updates state', async () => {
      (mockStakingApiService.getVaultDailyApys as jest.Mock).mockResolvedValue(
        [...MOCK_VAULT_DAILY_APYS].reverse(),
      );

      const { result } = renderHookWithProvider(() => useVaultApys(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.vaultApys).toStrictEqual(MOCK_VAULT_DAILY_APYS);
        expect(result.current.isLoadingVaultApys).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('handles error if API request fails', async () => {
      (mockStakingApiService.getVaultDailyApys as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const { result } = renderHookWithProvider(() => useVaultApys(), {
        state: mockInitialState,
      });

      await waitFor(async () => {
        expect(result.current.isLoadingVaultApys).toBe(false);
        expect(result.current.error).toBe('Failed to fetch vault APYs');
        expect(result.current.vaultApys).toStrictEqual([]);
      });
    });
  });

  describe('when refreshing vault APYs', () => {
    it('refreshes vault APYs', async () => {
      (mockStakingApiService.getVaultDailyApys as jest.Mock).mockResolvedValue(
        [...MOCK_VAULT_DAILY_APYS].reverse(),
      );

      const { result } = renderHookWithProvider(() => useVaultApys(), {
        state: mockInitialState,
      });

      await waitFor(async () => {
        expect(result.current.vaultApys).toStrictEqual(MOCK_VAULT_DAILY_APYS);
      });

      await act(async () => {
        result.current.refreshVaultApys();
      });

      await waitFor(() => {
        expect(mockStakingApiService.getVaultDailyApys).toHaveBeenCalledTimes(
          2,
        );
      });
    });
  });
});
