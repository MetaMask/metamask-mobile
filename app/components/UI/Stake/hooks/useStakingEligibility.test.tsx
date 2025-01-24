import { act, waitFor } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { type StakingApiService } from '@metamask/stake-sdk';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import useStakingEligibility from './useStakingEligibility';
import { Stake } from '../sdk/stakeSdkProvider';

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

// Mock Staking API Service
const mockStakingApiService: Partial<StakingApiService> = {
  getPooledStakingEligibility: jest.fn(),
};

const createMockStakeContext = (overrides?: Partial<Stake>) => ({
  setSdkType: jest.fn(),
  stakingApiService: mockStakingApiService as StakingApiService,
  ...overrides,
});

let mockSdkContext = createMockStakeContext();

// Mock the context
jest.mock('./useStakeContext', () => ({
  useStakeContext: () => mockSdkContext,
}));

describe('useStakingEligibility', () => {
  beforeEach(() => {
    mockSdkContext = createMockStakeContext();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when fetching staking eligibility', () => {
    it('fetches staking eligibility and sets the state correctly', async () => {
      // Mock API response
      (
        mockStakingApiService.getPooledStakingEligibility as jest.Mock
      ).mockResolvedValue({
        eligible: true,
      });

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
      (
        mockStakingApiService.getPooledStakingEligibility as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

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
      (
        mockStakingApiService.getPooledStakingEligibility as jest.Mock
      ).mockResolvedValueOnce({
        eligible: false,
      });

      const { result } = renderHookWithProvider(() => useStakingEligibility(), {
        state: mockInitialState,
      });

      // Initially not eligible
      await waitFor(() => {
        expect(result.current.isEligible).toBe(false);
      });

      // Simulate API response after refresh
      (
        mockStakingApiService.getPooledStakingEligibility as jest.Mock
      ).mockResolvedValueOnce({
        eligible: true,
      });

      // Trigger refresh
      await act(async () => {
        result.current.refreshPooledStakingEligibility();
      });

      // Wait for refresh result
      await waitFor(() => {
        expect(result.current.isEligible).toBe(true); // Updated to eligible
        expect(
          mockStakingApiService.getPooledStakingEligibility,
        ).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('when stakingApiService is undefined', () => {
    it('handles undefined stakingApiService gracefully', async () => {
      // Override the mock context with undefined stakingApiService
      mockSdkContext = createMockStakeContext({
        stakingApiService: undefined,
      });

      const { result } = renderHookWithProvider(() => useStakingEligibility(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.isLoadingEligibility).toBe(false);
        expect(result.current.isEligible).toBe(false);
      });
    });
  });
});
