import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictActivity } from './usePredictActivity';

const MOCK_ADDRESS = '0x1234567890123456789012345678901234567890';

const mockGetActivity = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getActivity: (...args: unknown[]) => mockGetActivity(...args),
    },
  },
}));

jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(() => ({
    address: MOCK_ADDRESS,
  })),
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

describe('usePredictActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivity.mockResolvedValue([]);
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
  });

  it('fetches activity automatically on mount', async () => {
    const { Wrapper } = createWrapper();
    const activity = [{ id: '1' }];
    mockGetActivity.mockResolvedValueOnce(activity);

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(activity);
    expect(result.current.error).toBeNull();
    expect(mockGetActivity).toHaveBeenCalledWith({ address: MOCK_ADDRESS });
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
    mockGetActivity.mockResolvedValueOnce([{ id: '1' }]);

    const { result } = renderHook(() => usePredictActivity(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetActivity.mockResolvedValueOnce([{ id: '2' }]);
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetActivity).toHaveBeenCalledTimes(2);
    expect(result.current.isRefetching).toBe(false);
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
