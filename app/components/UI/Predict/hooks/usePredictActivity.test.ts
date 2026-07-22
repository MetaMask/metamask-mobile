import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictActivity } from './usePredictActivity';
import type { PredictActivity } from '../types';
import { PREDICT_ACTIVITY_PAGE_SIZE } from '../constants/transactions';

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

const mockGetActivity = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getActivity: (...args: unknown[]) => mockGetActivity(...args),
    },
  },
}));

const mockGetEvmAccountFromSelectedAccountGroup = jest.fn<
  { address: string } | null,
  []
>(() => ({
  address: MOCK_ADDRESS,
}));
jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: () =>
    mockGetEvmAccountFromSelectedAccountGroup(),
}));

const mockEnsurePolygonNetworkExists = jest.fn<Promise<void>, []>();
jest.mock('./usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupId: jest.fn(() => 'mock-account-group-id'),
  }),
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: () => unknown) => selector(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper };
};

const createActivityPage = (
  length: number,
  prefix = 'activity',
): PredictActivity[] =>
  Array.from({ length }, (_, index) => ({
    id: `${prefix}-${index}`,
    providerId: 'stub',
    entry: {
      type: 'claimWinnings',
      timestamp: index,
      amount: index + 1,
    },
  }));

describe('usePredictActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivity.mockResolvedValue([]);
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
    mockGetEvmAccountFromSelectedAccountGroup.mockReturnValue({
      address: MOCK_ADDRESS,
    });
  });

  it('does not fetch activity when no EVM account is selected', () => {
    const { Wrapper } = createWrapper();
    mockGetEvmAccountFromSelectedAccountGroup.mockReturnValue(null);

    renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    expect(mockGetActivity).not.toHaveBeenCalled();
  });

  it('fetches activity automatically on mount', async () => {
    const { Wrapper } = createWrapper();
    const activity = createActivityPage(1);
    mockGetActivity.mockResolvedValueOnce(activity);

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(activity);
    expect(result.current.activity).toEqual(activity);
    expect(result.current.error).toBeNull();
    expect(mockGetActivity).toHaveBeenCalledWith({
      address: MOCK_ADDRESS,
      limit: PREDICT_ACTIVITY_PAGE_SIZE,
      offset: 0,
    });
  });

  it('uses custom limit for activity pages', async () => {
    const { Wrapper } = createWrapper();
    mockGetActivity.mockResolvedValueOnce(createActivityPage(1));

    const { result } = renderHook(() => usePredictActivity({ limit: 10 }), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetActivity).toHaveBeenCalledWith({
      address: MOCK_ADDRESS,
      limit: 10,
      offset: 0,
    });
  });

  it('exposes error when activity fetch fails', async () => {
    const { Wrapper } = createWrapper();
    mockGetActivity.mockRejectedValueOnce(new Error('Boom'));

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.error?.message).toBe('Boom');
  });

  it('uses refetch for refresh behavior', async () => {
    const { Wrapper } = createWrapper();
    mockGetActivity.mockResolvedValueOnce(createActivityPage(1, 'initial'));

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetActivity.mockResolvedValueOnce(createActivityPage(1, 'refetch'));
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetActivity).toHaveBeenCalledTimes(2);
    expect(mockGetActivity).toHaveBeenLastCalledWith({
      address: MOCK_ADDRESS,
      limit: PREDICT_ACTIVITY_PAGE_SIZE,
      offset: 0,
    });
    expect(result.current.isRefetching).toBe(false);
  });

  it('fetches the next page when the previous page reaches the limit', async () => {
    const { Wrapper } = createWrapper();
    const firstPage = createActivityPage(PREDICT_ACTIVITY_PAGE_SIZE, 'first');
    const secondPage = createActivityPage(5, 'second');
    mockGetActivity
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockGetActivity).toHaveBeenLastCalledWith({
      address: MOCK_ADDRESS,
      limit: PREDICT_ACTIVITY_PAGE_SIZE,
      offset: PREDICT_ACTIVITY_PAGE_SIZE,
    });
    await waitFor(() => {
      expect(result.current.data).toEqual([...firstPage, ...secondPage]);
    });
  });

  it('keeps the first activity when offset pages return duplicate ids', async () => {
    const { Wrapper } = createWrapper();
    const firstPage = createActivityPage(PREDICT_ACTIVITY_PAGE_SIZE, 'first');
    const duplicateActivity = {
      ...firstPage[PREDICT_ACTIVITY_PAGE_SIZE - 1],
      title: 'First page copy',
    };
    const uniqueActivity = createActivityPage(1, 'second')[0];
    mockGetActivity
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([duplicateActivity, uniqueActivity]);

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([...firstPage, uniqueActivity]);
    });
  });

  it('continues pagination when the previous page is shorter than the limit', async () => {
    const { Wrapper } = createWrapper();
    const firstPage = createActivityPage(1, 'first');
    const secondPage = createActivityPage(1, 'second');
    mockGetActivity
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockGetActivity).toHaveBeenLastCalledWith({
      address: MOCK_ADDRESS,
      limit: PREDICT_ACTIVITY_PAGE_SIZE,
      offset: PREDICT_ACTIVITY_PAGE_SIZE,
    });
    await waitFor(() => {
      expect(result.current.data).toEqual([...firstPage, ...secondPage]);
    });
  });

  it('stops pagination when the previous page is empty', async () => {
    const { Wrapper } = createWrapper();
    mockGetActivity.mockResolvedValueOnce([]);

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  it('ensures polygon network before running query', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
  });
});
