import { LendingPositionHistory } from '@metamask/stake-sdk';
import { act } from '@testing-library/react-hooks';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { backgroundState } from '../../../../util/test/initial-root-state';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { EARN_EXPERIENCES } from '../constants/experiences';
import { EarnTokenDetails } from '../types/lending.types';
import useEarningsHistory from './useEarningsHistory';
import { RootState } from '../../../../reducers';

// Mock the stakingApiService
jest.mock('../../Stake/sdk/stakeSdkProvider', () => ({
  stakingApiService: {
    getUserDailyRewards: jest.fn(),
  },
}));

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      getLendingPositionHistory: jest.fn(),
    },
  },
}));

describe('useEarningsHistory', () => {
  const mockSelectedAddress = '0x123';
  const mockChainId = '0x1';
  const mockLimitDays = 365;
  const accountId = `account-${mockSelectedAddress}`;
  const groupId = `keyring:test-wallet/ethereum`;
  const walletId = `keyring:test-wallet`;

  const mockInitialState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          ...MOCK_ACCOUNTS_CONTROLLER_STATE,
          internalAccounts: {
            accounts: {
              [accountId]: {
                id: accountId,
                address: mockSelectedAddress,
                type: 'eip155:eoa',
                scopes: ['eip155:0'],
              },
            },
            selectedAccount: accountId,
          },
        },
        AccountTreeController: {
          accountTree: {
            selectedAccountGroup: groupId,
            wallets: {
              [walletId]: {
                id: walletId,
                metadata: { name: 'Test Wallet' },
                groups: {
                  [groupId]: {
                    id: groupId,
                    accounts: [accountId],
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const mockPooledStakingAsset = {
    chainId: mockChainId,
    address: '0xpooled',
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    aggregators: [],
    image: '',
    logo: '',
    balance: '0',
    isETH: true,
    isStaked: true,
    experience: {
      type: EARN_EXPERIENCES.POOLED_STAKING,
    },
  } as unknown as EarnTokenDetails;

  const mockLendingAsset = {
    chainId: mockChainId,
    address: '0xlending',
    decimals: 18,
    symbol: 'USDC',
    name: 'USD Coin',
    aggregators: [],
    image: '',
    logo: '',
    balance: '0',
    isETH: false,
    isStaked: false,
    experience: {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      market: {
        id: 'market1',
        address: '0xmarket',
        protocol: 'protocol1',
        position: {
          id: 'position1',
        },
      },
    },
  } as unknown as EarnTokenDetails;

  const mockPooledStakingResponse = {
    userRewards: [
      {
        sumRewards: '1.5',
        dateStr: '2024-03-20',
        dailyRewards: '0.1',
      },
    ],
  };

  const mockLendingResponse = {
    id: 'position1',
    chainId: 1,
    market: {
      id: 'market1',
      address: '0xmarket',
      protocol: 'protocol1',
    },
    assets: '100',
    historicalAssets: [
      {
        timestamp: 1710936000000,
        assets: '0.2',
      },
    ],
    lifetimeRewards: [
      {
        assets: '1.0',
        token: {
          address: '0xtoken',
          symbol: 'USDC',
          decimals: 6,
        },
      },
    ],
  } as unknown as LendingPositionHistory;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch pooled staking earnings history successfully', async () => {
    const { stakingApiService } = jest.requireMock(
      '../../Stake/sdk/stakeSdkProvider',
    );
    stakingApiService.getUserDailyRewards.mockResolvedValueOnce(
      mockPooledStakingResponse,
    );

    const { result } = renderHookWithProvider(
      () =>
        useEarningsHistory({
          asset: mockPooledStakingAsset,
          limitDays: mockLimitDays,
        }),
      {
        state: mockInitialState,
      },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.earningsHistory).toBe(null);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(stakingApiService.getUserDailyRewards).toHaveBeenCalledWith(
      1, // numericChainId
      mockSelectedAddress,
      mockLimitDays,
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.earningsHistory).toEqual(
      mockPooledStakingResponse.userRewards,
    );
  });

  it('should fetch lending earnings history successfully', async () => {
    const Engine = jest.requireMock('../../../../core/Engine');
    Engine.context.EarnController.getLendingPositionHistory.mockResolvedValueOnce(
      mockLendingResponse,
    );

    const { result } = renderHookWithProvider(
      () =>
        useEarningsHistory({
          asset: mockLendingAsset,
          limitDays: mockLimitDays,
        }),
      {
        state: mockInitialState,
      },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.earningsHistory).toBe(null);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      Engine.context.EarnController.getLendingPositionHistory,
    ).toHaveBeenCalledWith({
      address: mockSelectedAddress,
      chainId: 1,
      positionId: 'position1',
      marketId: 'market1',
      marketAddress: '0xmarket',
      protocol: 'protocol1',
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.earningsHistory).toEqual([
      {
        timestamp: 1710936000000,
        dateStr: '2024-03-20',
        sumRewards: '1.0',
        dailyRewards: '0.2',
      },
    ]);
  });

  it('should handle pooled staking error', async () => {
    const { stakingApiService } = jest.requireMock(
      '../../Stake/sdk/stakeSdkProvider',
    );
    stakingApiService.getUserDailyRewards.mockRejectedValueOnce(
      new Error('API Error'),
    );

    const { result } = renderHookWithProvider(
      () =>
        useEarningsHistory({
          asset: mockPooledStakingAsset,
          limitDays: mockLimitDays,
        }),
      {
        state: mockInitialState,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(
      'Failed to fetch pooled staking earnings history',
    );
    expect(result.current.earningsHistory).toBe(null);
  });

  it('should handle lending error', async () => {
    const Engine = jest.requireMock('../../../../core/Engine');
    Engine.context.EarnController.getLendingPositionHistory.mockRejectedValueOnce(
      new Error('API Error'),
    );

    const { result } = renderHookWithProvider(
      () =>
        useEarningsHistory({
          asset: mockLendingAsset,
          limitDays: mockLimitDays,
        }),
      {
        state: mockInitialState,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(
      'Failed to fetch lending earnings history',
    );
    expect(result.current.earningsHistory).toBe(null);
  });

  it('should not fetch data if stakingApiService is not available for pooled staking', async () => {
    const { stakingApiService } = jest.requireMock(
      '../../Stake/sdk/stakeSdkProvider',
    );
    stakingApiService.getUserDailyRewards = undefined;

    const { result } = renderHookWithProvider(
      () =>
        useEarningsHistory({
          asset: mockPooledStakingAsset,
          limitDays: mockLimitDays,
        }),
      {
        state: mockInitialState,
      },
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(
      'Failed to fetch pooled staking earnings history',
    );
    expect(result.current.earningsHistory).toBe(null);
  });
});
