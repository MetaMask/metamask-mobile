import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { MOCK_VAULT_APRS } from '../components/PoolStakingLearnMoreModal/mockVaultRewards';
import { act, waitFor } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { StakingApiService } from '@metamask/stake-sdk';
import { Stake } from '../sdk/stakeSdkProvider';
import useVaultAprs from './useVaultAprs';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const mockStakingApiService: Partial<StakingApiService> = {
  getVaultAprs: jest.fn(),
};

const mockSdkContext: Stake = {
  stakingApiService: mockStakingApiService as StakingApiService,
  setSdkType: jest.fn(),
};

jest.mock('./useStakeContext', () => ({
  useStakeContext: () => mockSdkContext as Stake,
}));

describe('useVaultAprs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching vaultAprs', () => {
    it('fetches vaultAprs and updates state', async () => {
      (mockStakingApiService.getVaultAprs as jest.Mock).mockResolvedValue(
        MOCK_VAULT_APRS,
      );

      const { result } = renderHookWithProvider(() => useVaultAprs(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.vaultAprs).toStrictEqual(MOCK_VAULT_APRS);
        expect(result.current.isLoadingVaultAprs).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('handles error if API request fails', async () => {
      (mockStakingApiService.getVaultAprs as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const { result } = renderHookWithProvider(() => useVaultAprs(), {
        state: mockInitialState,
      });

      await waitFor(async () => {
        expect(result.current.isLoadingVaultAprs).toBe(false);
        expect(result.current.error).toBe('Failed to fetch vault APRs');
        expect(result.current.vaultAprs).toStrictEqual({});
      });
    });
  });

  describe('when refreshing vault APRs', () => {
    it('refreshes vault APRs', async () => {
      (mockStakingApiService.getVaultAprs as jest.Mock).mockResolvedValue(
        MOCK_VAULT_APRS,
      );

      const { result } = renderHookWithProvider(() => useVaultAprs(), {
        state: mockInitialState,
      });

      await waitFor(async () => {
        expect(result.current.vaultAprs).toStrictEqual(MOCK_VAULT_APRS);
      });

      await act(async () => {
        result.current.refreshVaultAprs();
      });

      await waitFor(() => {
        expect(mockStakingApiService.getVaultAprs).toHaveBeenCalledTimes(2);
      });
    });
  });
});
