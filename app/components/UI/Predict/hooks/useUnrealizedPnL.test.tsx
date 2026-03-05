import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUnrealizedPnL } from './useUnrealizedPnL';
import { UnrealizedPnL } from '../types';

const mockSelectedAddress = '0x1234567890123456789012345678901234567890';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'mock-account-group-id'),
}));

const mockGetUnrealizedPnL = jest.fn();

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getUnrealizedPnL: (...args: unknown[]) => mockGetUnrealizedPnL(...args),
    },
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn(() => [
        {
          id: 'test-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: {
            lastSelected: 0,
          },
        },
      ]),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useUnrealizedPnL', () => {
  const basePnL: UnrealizedPnL = {
    user: '0x1111111111111111111111111111111111111111',
    cashUpnl: 12.5,
    percentUpnl: 3.4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch when enabled is false', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUnrealizedPnL({ enabled: false }), {
      wrapper: Wrapper,
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();
  });

  it('fetches unrealized P&L successfully with default options', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { result } = renderHook(() => useUnrealizedPnL(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(basePnL);
    expect(result.current.error).toBeNull();
    expect(mockGetUnrealizedPnL).toHaveBeenCalledWith({
      address: mockSelectedAddress,
    });
  });

  it('uses provided address instead of selected account', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);
    const customAddress = '0x2222222222222222222222222222222222222222';

    const { result } = renderHook(
      () => useUnrealizedPnL({ address: customAddress }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(basePnL);
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledWith({
      address: customAddress,
    });
  });

  it('handles null responses', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockResolvedValue(null);

    const { result } = renderHook(() => useUnrealizedPnL(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors thrown by getUnrealizedPnL', async () => {
    const { Wrapper } = createWrapper();
    mockGetUnrealizedPnL.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUnrealizedPnL(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Network error');
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });
});
