import { waitFor } from '@testing-library/react-native';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import useStakingEligibility from './useStakingEligibility';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';

// Mock initial state for the hook
const MOCK_ADDRESS_1 = '0xAddress';
const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      refreshStakingEligibility: jest.fn(),
    },
  },
}));

const renderHook = () =>
  renderHookWithProvider(() => useStakingEligibility(), {
    state: mockInitialState,
  });

describe('useStakingEligibility', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('when fetching staking eligibility', () => {
    it('handles error while fetching staking eligibility', async () => {
      // Mock API error
      (
        Engine.context.EarnController.refreshStakingEligibility as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook();

      await waitFor(() => {
        expect(result.current.isLoadingEligibility).toBe(false);
        expect(result.current.error).toBe(
          'Failed to fetch pooled staking eligibility',
        );
      });
    });
  });
});
