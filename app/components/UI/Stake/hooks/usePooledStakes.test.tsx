import { PooledStakeExitRequest } from '@metamask/stake-sdk';

import { MOCK_GET_POOLED_STAKES_API_RESPONSE } from '../__mocks__/mockData';
import { createMockAccountsControllerState } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import usePooledStakes from './usePooledStakes';
import { act, waitFor } from '@testing-library/react-native';
import {
  EarnControllerState,
  PooledStakingState,
} from '@metamask/earn-controller';
import Engine from '../../../../core/Engine';
import { RootState } from '../../../../reducers';

const MOCK_ADDRESS_1 = '0x0';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS_1,
]);

const mockPooledStakeData = MOCK_GET_POOLED_STAKES_API_RESPONSE.accounts[0];
const mockExchangeRate = MOCK_GET_POOLED_STAKES_API_RESPONSE.exchangeRate;

const mockInitialEarnControllerState: DeepPartial<EarnControllerState> = {
  pooled_staking: {
    pooledStakes: mockPooledStakeData,
    exchangeRate: mockExchangeRate,
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
    EarnController: {
      refreshPooledStakes: jest.fn(),
    },
  },
}));

const renderHook = (state?: {
  pooledStakes?: PooledStakingState['pooledStakes'];
  exchangeRate?: PooledStakingState['exchangeRate'];
}) => {
  const mockState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        EarnController: {
          ...mockInitialEarnControllerState,
          pooled_staking: {
            ...mockInitialEarnControllerState.pooled_staking,
            pooledStakes: state?.pooledStakes,
            exchangeRate: state?.exchangeRate,
          },
        },
      },
    },
  };

  return renderHookWithProvider(() => usePooledStakes(), { state: mockState });
};

describe('usePooledStakes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('when fetching pooled stakes data', () => {
    it('handles error if the API request fails', async () => {
      (
        Engine.context.EarnController.refreshPooledStakes as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook();

      await act(async () => {
        await result.current.refreshPooledStakes();
      });

      await waitFor(() => {
        expect(result.current.isLoadingPooledStakesData).toBe(false);
        expect(result.current.error).toBe('Failed to fetch pooled stakes');
      });
    });
  });

  describe('when handling staking statuses', () => {
    it('returns ACTIVE status when assets are greater than 0', async () => {
      const { result } = renderHook({
        pooledStakes: { ...mockPooledStakeData, assets: '100' },
        exchangeRate: '1.2',
      });

      await waitFor(() => {
        expect(result.current.hasStakedPositions).toBe(true); // ACTIVE status
        expect(result.current.hasEthToUnstake).toBe(true); // Able to unstake ETH
        expect(result.current.hasRewards).toBe(true); // Has rewards
      });
    });

    it('returns INACTIVE_WITH_EXIT_REQUESTS when assets are 0 and there are exit requests', async () => {
      const { result } = renderHook({
        pooledStakes: {
          ...mockPooledStakeData,
          assets: '0',
          exitRequests: [{ id: 'exit-1' } as unknown as PooledStakeExitRequest],
        },
        exchangeRate: '1.2',
      });

      await waitFor(() => {
        expect(result.current.hasStakedPositions).toBe(true); // INACTIVE_WITH_EXIT_REQUESTS
        expect(result.current.hasEthToUnstake).toBe(false); // Unable to unstake ETH
      });
    });

    it('returns INACTIVE_WITH_REWARDS_ONLY when assets are 0 but has rewards', async () => {
      const { result } = renderHook({
        pooledStakes: {
          ...mockPooledStakeData,
          assets: '0',
          lifetimeRewards: '50',
          exitRequests: [],
        },
        exchangeRate: '1.2',
      });

      await waitFor(() => {
        expect(result.current.hasRewards).toBe(true); // Has rewards
        expect(result.current.hasRewardsOnly).toBe(true); // INACTIVE_WITH_REWARDS_ONLY
      });
    });

    it('returns NEVER_STAKED when assets and rewards are 0', async () => {
      const { result } = renderHook();

      await waitFor(() => {
        expect(result.current.hasNeverStaked).toBe(true); // NEVER_STAKED status
        expect(result.current.hasStakedPositions).toBe(false); // No staked positions
      });
    });
  });
});
