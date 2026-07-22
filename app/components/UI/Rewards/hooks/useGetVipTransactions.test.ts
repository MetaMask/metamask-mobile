import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useGetVipTransactions } from './useGetVipTransactions';
import Engine from '../../../../core/Engine';
import {
  selectIsCurrentSubscriptionVipEnabled,
  selectRewardsSubscriptionId,
} from '../../../../selectors/rewards';
import { selectVipTransactionsById } from '../../../../reducers/rewards/selectors';
import { setVipTransactions } from '../../../../reducers/rewards';
import type { VipTransactionDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
  selectIsCurrentSubscriptionVipEnabled: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectVipTransactionsById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setVipTransactions: jest.fn((payload) => ({
    type: 'rewards/setVipTransactions',
    payload,
  })),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSelectVipTransactionsById =
  selectVipTransactionsById as jest.MockedFunction<
    typeof selectVipTransactionsById
  >;

const SUBSCRIPTION_ID = 'sub-456';

const MOCK_TX: VipTransactionDto = {
  id: 'tx-1',
  type: 'PERPS',
  timestamp: '2026-03-28T14:30:00.000Z',
  feeUsd: '1.25',
  volumeUsd: '1000.00',
  perps: {
    coin: 'ETH',
    feeCoin: 'USDC',
    rawFee: '1250000',
    rawNotionalVolume: '1000000000',
    tradeId: 'trade-1',
    orderId: 'order-1',
  },
};

const MOCK_PAGE_1 = {
  results: [MOCK_TX],
  has_more: true,
  cursor: 'page-2-cursor',
};

const MOCK_PAGE_2 = {
  results: [{ ...MOCK_TX, id: 'tx-2', timestamp: '2026-03-27T10:00:00.000Z' }],
  has_more: false,
  cursor: null,
};

interface SelectorState {
  subscriptionId: string | null;
  cachedTransactions: VipTransactionDto[] | null;
  isVipEnabled?: boolean;
}

function setupSelectors(state: SelectorState) {
  const isVipEnabled = state.isVipEnabled ?? true;
  const mockTxSelector = jest.fn().mockReturnValue(state.cachedTransactions);
  mockSelectVipTransactionsById.mockReturnValue(mockTxSelector);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return state.subscriptionId;
    if (selector === selectIsCurrentSubscriptionVipEnabled) return isVipEnabled;
    if (selector === mockTxSelector) return state.cachedTransactions;
    return undefined;
  });
}

describe('useGetVipTransactions', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      cachedTransactions: null,
    });
  });

  it('does not fetch when subscriptionId is missing', async () => {
    setupSelectors({ subscriptionId: null, cachedTransactions: null });

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.transactions).toBeNull();
  });

  it('does not fetch when VIP is not enabled', async () => {
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      cachedTransactions: null,
      isVipEnabled: false,
    });

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.transactions).toBeNull();
  });

  it('fetches first page and dispatches result', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PAGE_1 as never);

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    await waitFor(() => {
      expect(result.current.transactions).toEqual(MOCK_PAGE_1.results);
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getVipTransactions',
      {
        subscriptionId: SUBSCRIPTION_ID,
        type: 'PERPS',
        cursor: null,
        forceFresh: false,
      },
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setVipTransactions({
        subscriptionId: SUBSCRIPTION_ID,
        type: 'PERPS',
        transactions: MOCK_PAGE_1.results,
      }),
    );
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error on fetch failure', async () => {
    mockCall.mockRejectedValueOnce(new Error('Network failure') as never);

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    await waitFor(() => {
      expect(result.current.error).toBe('Network failure');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.transactions).toBeNull();
  });

  it('loads more pages and appends results', async () => {
    mockCall
      .mockResolvedValueOnce(MOCK_PAGE_1 as never)
      .mockResolvedValueOnce(MOCK_PAGE_2 as never);

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenLastCalledWith(
      'RewardsController:getVipTransactions',
      {
        subscriptionId: SUBSCRIPTION_ID,
        type: 'PERPS',
        cursor: 'page-2-cursor',
        forceFresh: undefined,
      },
    );
    expect(result.current.transactions).toHaveLength(2);
  });

  it('does not loadMore when hasMore is false', async () => {
    const noMorePage = { ...MOCK_PAGE_1, has_more: false, cursor: null };
    mockCall.mockResolvedValueOnce(noMorePage as never);

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    act(() => {
      result.current.loadMore();
    });

    expect(mockCall).toHaveBeenCalledTimes(1);
  });

  it('hydrates from Redux cache when local state is empty', async () => {
    const cached = [MOCK_TX];
    setupSelectors({
      subscriptionId: SUBSCRIPTION_ID,
      cachedTransactions: cached,
      isVipEnabled: false,
    });

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    await waitFor(() => {
      expect(result.current.transactions).toEqual(cached);
    });
  });

  it('refresh resets and re-fetches first page with forceFresh', async () => {
    mockCall.mockResolvedValueOnce(MOCK_PAGE_1 as never).mockResolvedValueOnce({
      results: [{ ...MOCK_TX, volumeUsd: '9999.00' }],
      has_more: false,
      cursor: null,
    } as never);

    const { result } = renderHook(() => useGetVipTransactions('PERPS'));

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(1);
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });

    expect(mockCall).toHaveBeenCalledTimes(2);
    expect(mockCall).toHaveBeenLastCalledWith(
      'RewardsController:getVipTransactions',
      {
        subscriptionId: SUBSCRIPTION_ID,
        type: 'PERPS',
        cursor: null,
        forceFresh: true,
      },
    );
    expect(result.current.transactions?.[0].volumeUsd).toBe('9999.00');
    expect(result.current.hasMore).toBe(false);
  });

  it('calls selectVipTransactionsById with subscriptionId and type', () => {
    renderHook(() => useGetVipTransactions('SWAP'));

    expect(mockSelectVipTransactionsById).toHaveBeenCalledWith(
      SUBSCRIPTION_ID,
      'SWAP',
    );
  });
});
