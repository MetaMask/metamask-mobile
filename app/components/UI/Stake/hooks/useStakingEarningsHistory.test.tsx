import { ChainId } from '@metamask/controller-utils';
import useStakingEarningsHistory from './useStakingEarningsHistory';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { StakingApiService, UserDailyReward } from '@metamask/stake-sdk';
import { waitFor } from '@testing-library/react-native';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('useStakingEarningsHistory', () => {
  it('should return loading state initially', async () => {
    jest
      .spyOn(StakingApiService.prototype, 'getUserDailyRewards')
      .mockResolvedValue({
        userRewards: [],
      });

    const { result } = renderHookWithProvider(
      () =>
        useStakingEarningsHistory({
          chainId: ChainId.mainnet,
          limitDays: 365,
        }),
      {
        state: mockInitialState,
      },
    );
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.isLoading).toBeFalsy();
    });
  });

  it('should return error state if fetching fails', async () => {
    jest
      .spyOn(StakingApiService.prototype, 'getUserDailyRewards')
      .mockImplementation(() => {
        throw new Error('Fetch failed');
      });

    const { result } = renderHookWithProvider(
      () =>
        useStakingEarningsHistory({
          chainId: ChainId.mainnet,
          limitDays: 365,
        }),
      {
        state: mockInitialState,
      },
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch earnings history');
    });
  });

  it('should return earnings history when fetched successfully', async () => {
    jest
      .spyOn(StakingApiService.prototype, 'getUserDailyRewards')
      .mockResolvedValue({
        userRewards: [
          {
            dateStr: '2024-01-01',
            dailyRewards: '100',
            sumRewards: '100',
          } as UserDailyReward,
        ],
      });

    const { result } = renderHookWithProvider(
      () =>
        useStakingEarningsHistory({
          chainId: ChainId.mainnet,
          limitDays: 365,
        }),
      {
        state: mockInitialState,
      },
    );

    await waitFor(() => {
      expect(result.current?.earningsHistory).toBeInstanceOf(Array);
      expect(result.current?.earningsHistory?.length).toBe(1);
    });
  });
});
