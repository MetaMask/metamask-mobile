import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import usePooledStakingVaultDailyApys from './usePooledStakingVaultApys';
import { act } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Engine from '../../../../core/Engine';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      refreshPooledStakingVaultDailyApys: jest.fn(),
    },
  },
}));

describe('usePooledStakingVaultApys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching pooled staking vault apys', () => {
    it('handles error if API request fails', async () => {
      (
        Engine.context.EarnController
          .refreshPooledStakingVaultDailyApys as jest.Mock
      ).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHookWithProvider(
        () => usePooledStakingVaultDailyApys(),
        {
          state: mockInitialState,
        },
      );

      await act(async () => {
        await result.current.refreshPooledStakingVaultApys();
      });

      expect(result.current.isLoadingVaultApys).toBe(false);
      expect(result.current.error).toBe(
        'Failed to fetch pooled staking vault daily APYs',
      );
      expect(result.current.vaultApys).toStrictEqual([]);
    });
  });
});
