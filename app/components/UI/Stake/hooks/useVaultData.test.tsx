import { act, waitFor } from '@testing-library/react-native';
import useVaultData from './useVaultData';
import { stakingApiService } from '../sdk/stakeSdkProvider';
import { MOCK_GET_VAULT_RESPONSE } from '../__mocks__/mockData';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Engine from '../../../../core/Engine';
import { PooledStakingState } from '@metamask/earn-controller';
import { RootState } from '../../../../reducers';

const mockVaultMetadata = MOCK_GET_VAULT_RESPONSE;

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      refreshPooledStakingVaultMetadata: jest.fn(),
    },
  },
}));

const renderHook = (vaultMetadata?: PooledStakingState['vaultMetadata']) => {
  const mockState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...backgroundState,
        EarnController: {
          pooled_staking: {
            vaultMetadata: {
              ...mockVaultMetadata,
              ...vaultMetadata,
            },
          },
        },
      },
    },
  };

  return renderHookWithProvider(() => useVaultData(), { state: mockState });
};

describe('useVaultData', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('when fetching vault data', () => {
    it('handles error if the API request fails', async () => {
      // Simulate API error
      (
        Engine.context.EarnController
          .refreshPooledStakingVaultMetadata as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook();

      await act(async () => {
        await result.current.refreshPoolStakingVaultData();
      });

      await waitFor(() => {
        expect(result.current.isLoadingVaultData).toBe(false);
        expect(result.current.error).toBe('Failed to fetch vault data');
      });
    });
  });

  describe('when validating annual reward rate', () => {
    it('calculates the annual reward rate correctly based on the fetched APY', async () => {
      // Mock API response with a custom APY
      const customVaultData = { ...mockVaultMetadata, apy: '7.0' };

      const { result } = renderHook(customVaultData);

      await waitFor(() => {
        expect(result.current.vaultData).toEqual(customVaultData);
        expect(result.current.annualRewardRate).toBe('7.0%');
        expect(result.current.annualRewardRateDecimal).toBe(0.07);
        expect(result.current.isLoadingVaultData).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('returns "0%" when the APY is not available', async () => {
      // Mock API response with an empty APY
      const emptyApyVaultData = { ...mockVaultMetadata, apy: '' };

      jest
        .spyOn(stakingApiService, 'getVaultData')
        .mockResolvedValue(emptyApyVaultData);

      const { result } = renderHook(emptyApyVaultData);

      await waitFor(() => {
        expect(result.current.vaultData).toEqual(emptyApyVaultData);
        expect(result.current.annualRewardRate).toBe('0%');
        expect(result.current.annualRewardRateDecimal).toBe(0);
      });
    });
  });
});
