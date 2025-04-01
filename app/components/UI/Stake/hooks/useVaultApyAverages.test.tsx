import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import useVaultApyAverages from './useVaultApyAverages';
import { DEFAULT_VAULT_APY_AVERAGES } from '../constants';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      refreshPooledStakingVaultApyAverages: jest.fn(),
    },
  },
}));

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
  });

  describe('when fetching vaultApyAverages', () => {
    it('handles error if API request fails', async () => {
      // Simulate API error
      (
        Engine.context.EarnController
          .refreshPooledStakingVaultApyAverages as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

      const { result } = renderHookWithProvider(() => useVaultApyAverages(), {
        state: mockInitialState,
      });

      await act(async () => {
        await result.current.refreshVaultApyAverages();
      });

      expect(result.current.isLoadingVaultApyAverages).toBe(false);
      expect(result.current.error).toBe(
        'Failed to fetch pooled staking vault APY averages',
      );
      expect(result.current.vaultApyAverages).toStrictEqual(
        DEFAULT_VAULT_APY_AVERAGES,
      );
    });
  });
});
