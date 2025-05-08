import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import useStakingEligibility from './useStakingEligibility';
import { mockEarnControllerRootState } from '../testUtils';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      refreshStakingEligibility: jest.fn(),
    },
  },
}));

// Mock initial state for the hook
const MOCK_ADDRESS_1 = '0xAddress';
const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const MOCK_EARN_STATE = mockEarnControllerRootState();

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      EarnController: MOCK_EARN_STATE.engine.backgroundState.EarnController,
    },
  },
};

describe('useStakingEligibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching staking eligibility', () => {
    it('handles error while fetching staking eligibility', async () => {
      (
        Engine.context.EarnController.refreshStakingEligibility as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

      const { result } = renderHookWithProvider(() => useStakingEligibility(), {
        state: mockInitialState,
      });

      await act(async () => {
        await result.current.refreshPooledStakingEligibility();
      });

      await waitFor(() => {
        expect(result.current.isLoadingEligibility).toBe(false);
        expect(result.current.error).toBe(
          'Failed to fetch pooled staking eligibility',
        );
        expect(result.current.isEligible).toBe(true);
      });
    });
  });
});
