import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import useStakingEligibility from './useStakingEligibility';
import { stakingApiService } from '../sdk/stakeSdkProvider';

// Mock initial state for the hook
const MOCK_ADDRESS_1 = '0xAddress';
const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

describe('useStakingEligibility', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching staking eligibility', () => {
    it('fetches staking eligibility and sets the state correctly', async () => {
      // Mock API response
      jest
        .spyOn(stakingApiService, 'getPooledStakingEligibility')
        .mockResolvedValue({ eligible: true });

      const { result } = renderHookWithProvider(() => useStakingEligibility(), {
        state: mockInitialState,
      });

      // Initially loading should be true
      expect(result.current.isLoadingEligibility).toBe(true);

      // Wait for state updates
      await waitFor(() => {
        expect(result.current.isEligible).toBe(true); // Eligible
        expect(result.current.isLoadingEligibility).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('handles error while fetching staking eligibility', async () => {
      // Mock API error
      jest
        .spyOn(stakingApiService, 'getPooledStakingEligibility')
        .mockRejectedValue(new Error('API Error'));

      const { result } = renderHookWithProvider(() => useStakingEligibility(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.isLoadingEligibility).toBe(false);
        expect(result.current.error).toBe(
          'Failed to fetch pooled staking eligibility',
        );
        expect(result.current.isEligible).toBe(false); // Default to false
      });
    });
  });

  describe('when refreshing staking eligibility', () => {
    it('refreshes staking eligibility successfully', async () => {
      // Mock initial API response
      const getPooledStakingEligibilitySpy = jest
        .spyOn(stakingApiService, 'getPooledStakingEligibility')
        .mockResolvedValue({ eligible: false });

      const { result } = renderHookWithProvider(() => useStakingEligibility(), {
        state: mockInitialState,
      });

      // Initially not eligible
      await waitFor(() => {
        expect(result.current.isEligible).toBe(false);
      });

      // Simulate API response after refresh
      getPooledStakingEligibilitySpy.mockResolvedValue({ eligible: true });

      // Trigger refresh
      await act(async () => {
        result.current.refreshPooledStakingEligibility();
      });

      // Wait for refresh result
      await waitFor(() => {
        expect(result.current.isEligible).toBe(true); // Updated to eligible
        expect(getPooledStakingEligibilitySpy).toHaveBeenCalledTimes(2);
      });
    });
  });
});
