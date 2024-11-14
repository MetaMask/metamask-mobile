import { type StakingApiService } from '@metamask/stake-sdk';

import { MOCK_GET_POOLED_STAKES_API_RESPONSE } from '../__mocks__/mockData';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import type { Stake } from '../sdk/stakeSdkProvider';
import usePooledStakes from './usePooledStakes';
import { act, waitFor } from '@testing-library/react-native';

const MOCK_ADDRESS_1 = '0x0';

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

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

const mockStakingApiService: Partial<StakingApiService> = {
  getPooledStakes: jest.fn(),
};

const mockSdkContext: Stake = {
  stakingApiService: mockStakingApiService as StakingApiService,
  setSdkType: jest.fn(),
};

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];
const mockExchangeRate = MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate;

jest.mock('../hooks/useStakeContext', () => ({
  useStakeContext: () => mockSdkContext as Stake,
}));

describe('usePooledStakes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('when fetching pooled stakes data', () => {
    it('fetches pooled stakes data and updates state', async () => {
      (mockStakingApiService.getPooledStakes as jest.Mock).mockResolvedValue({
        accounts: [mockPooledStakeData],
        exchangeRate: mockExchangeRate,
      });

      const { result } = renderHookWithProvider(() => usePooledStakes(), {
        state: mockInitialState,
      });

      // Use waitFor to wait for state updates
      await waitFor(() => {
        expect(result.current.pooledStakesData).toEqual(mockPooledStakeData);
        expect(result.current.exchangeRate).toBe(mockExchangeRate);
        expect(result.current.isLoadingPooledStakesData).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('handles error if the API request fails', async () => {
      (mockStakingApiService.getPooledStakes as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const { result } = renderHookWithProvider(() => usePooledStakes(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.isLoadingPooledStakesData).toBe(false);
        expect(result.current.error).toBe('Failed to fetch pooled stakes');
        expect(result.current.pooledStakesData).toEqual({});
      });
    });
  });

  describe('when handling staking statuses', () => {
    it('returns ACTIVE status when assets are greater than 0', async () => {
      (mockStakingApiService.getPooledStakes as jest.Mock).mockResolvedValue({
        accounts: [{ ...mockPooledStakeData, assets: '100' }],
        exchangeRate: '1.2',
      });

      const { result } = renderHookWithProvider(() => usePooledStakes(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.hasStakedPositions).toBe(true); // ACTIVE status
        expect(result.current.hasEthToUnstake).toBe(true); // Able to unstake ETH
        expect(result.current.hasRewards).toBe(true); // Has rewards
      });
    });

    it('returns INACTIVE_WITH_EXIT_REQUESTS when assets are 0 and there are exit requests', async () => {
      (mockStakingApiService.getPooledStakes as jest.Mock).mockResolvedValue({
        accounts: [
          {
            ...mockPooledStakeData,
            assets: '0',
            exitRequests: [{ id: 'exit-1' }],
          },
        ],
        exchangeRate: '1.2',
      });

      const { result } = renderHookWithProvider(() => usePooledStakes(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.hasStakedPositions).toBe(true); // INACTIVE_WITH_EXIT_REQUESTS
        expect(result.current.hasEthToUnstake).toBe(false); // Unable to unstake ETH
      });
    });

    it('returns INACTIVE_WITH_REWARDS_ONLY when assets are 0 but has rewards', async () => {
      (mockStakingApiService.getPooledStakes as jest.Mock).mockResolvedValue({
        accounts: [
          {
            ...mockPooledStakeData,
            assets: '0',
            lifetimeRewards: '50',
            exitRequests: [],
          },
        ],
        exchangeRate: '1.2',
      });

      const { result } = renderHookWithProvider(() => usePooledStakes(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.hasRewards).toBe(true); // Has rewards
        expect(result.current.hasRewardsOnly).toBe(true); // INACTIVE_WITH_REWARDS_ONLY
      });
    });

    it('returns NEVER_STAKED when assets and rewards are 0', async () => {
      (mockStakingApiService.getPooledStakes as jest.Mock).mockResolvedValue({
        accounts: [
          {
            ...mockPooledStakeData,
            assets: '0',
            lifetimeRewards: '0',
            exitRequests: [],
          },
        ],
        exchangeRate: '1.2',
      });

      const { result } = renderHookWithProvider(() => usePooledStakes(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.hasNeverStaked).toBe(true); // NEVER_STAKED status
        expect(result.current.hasStakedPositions).toBe(false); // No staked positions
      });
    });
  });

  describe('when refreshing pooled stakes', () => {
    it('refreshes pooled stakes when refreshPooledStakes is called', async () => {
      (mockStakingApiService.getPooledStakes as jest.Mock).mockResolvedValue({
        accounts: [mockPooledStakeData],
        exchangeRate: mockExchangeRate,
      });

      const { result } = renderHookWithProvider(() => usePooledStakes(), {
        state: mockInitialState,
      });

      await waitFor(() => {
        expect(result.current.pooledStakesData).toEqual(mockPooledStakeData);
      });

      // Call refreshPooledStakes inside act() to ensure state update
      await act(async () => {
        result.current.refreshPooledStakes();
      });

      await waitFor(() => {
        expect(mockStakingApiService.getPooledStakes).toHaveBeenCalledTimes(2);
      });
    });
  });
});
