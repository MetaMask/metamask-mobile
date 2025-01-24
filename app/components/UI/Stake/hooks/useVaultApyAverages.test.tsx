import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { MOCK_VAULT_APY_AVERAGES } from '../components/PoolStakingLearnMoreModal/mockVaultRewards';
import { act, waitFor } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { StakingApiService } from '@metamask/stake-sdk';
import { Stake } from '../sdk/stakeSdkProvider';
import useVaultApyAverages from './useVaultApyAverages';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const mockStakingApiService: Partial<StakingApiService> = {
  getVaultApyAverages: jest.fn(),
};

const mockSdkContext: Stake = {
  stakingApiService: mockStakingApiService as StakingApiService,
  setSdkType: jest.fn(),
};

jest.mock('./useStakeContext', () => ({
  useStakeContext: () => mockSdkContext as Stake,
}));

describe('useVaultApyAverages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching vaultApyAverages', () => {
    it('fetches vaultApyAverages and updates state', async () => {
      (
        mockStakingApiService.getVaultApyAverages as jest.Mock
      ).mockResolvedValue(MOCK_VAULT_APY_AVERAGES);

      const { result } = renderHookWithProvider(() => useVaultApyAverages(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.vaultApyAverages).toStrictEqual(
          MOCK_VAULT_APY_AVERAGES,
        );
        expect(result.current.isLoadingVaultApyAverages).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('handles error if API request fails', async () => {
      (
        mockStakingApiService.getVaultApyAverages as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

      const { result } = renderHookWithProvider(() => useVaultApyAverages(), {
        state: mockInitialState,
      });

      await waitFor(async () => {
        expect(result.current.isLoadingVaultApyAverages).toBe(false);
        expect(result.current.error).toBe('Failed to fetch vault APY averages');
        expect(result.current.vaultApyAverages).toStrictEqual({});
      });
    });
  });

  describe('when refreshing vault APY averages', () => {
    it('refreshes vault APY averages', async () => {
      (
        mockStakingApiService.getVaultApyAverages as jest.Mock
      ).mockResolvedValue(MOCK_VAULT_APY_AVERAGES);

      const { result } = renderHookWithProvider(() => useVaultApyAverages(), {
        state: mockInitialState,
      });

      await waitFor(async () => {
        expect(result.current.vaultApyAverages).toStrictEqual(
          MOCK_VAULT_APY_AVERAGES,
        );
      });

      await act(async () => {
        result.current.refreshVaultApyAverages();
      });

      await waitFor(() => {
        expect(mockStakingApiService.getVaultApyAverages).toHaveBeenCalledTimes(
          2,
        );
      });
    });
  });
});
