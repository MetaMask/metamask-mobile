import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { MOCK_VAULT_APY_AVERAGES } from '../components/PoolStakingLearnMoreModal/mockVaultRewards';
import { act, waitFor } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { stakingApiService } from '../sdk/stakeSdkProvider';
import useVaultApyAverages from './useVaultApyAverages';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('useVaultApyAverages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(stakingApiService, 'getVaultApyAverages');
  });

  describe('when fetching vaultApyAverages', () => {
    it('fetches vaultApyAverages and updates state', async () => {
      jest
        .spyOn(stakingApiService, 'getVaultApyAverages')
        .mockResolvedValue(MOCK_VAULT_APY_AVERAGES);

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
      jest
        .spyOn(stakingApiService, 'getVaultApyAverages')
        .mockRejectedValue(new Error('API Error'));

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
      const getVaultApyAveragesSpy = jest
        .spyOn(stakingApiService, 'getVaultApyAverages')
        .mockResolvedValue(MOCK_VAULT_APY_AVERAGES);

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
        expect(getVaultApyAveragesSpy).toHaveBeenCalledTimes(2);
      });
    });
  });
});
