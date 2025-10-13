import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useUnrealizedPnL } from './useUnrealizedPnL';
import { UnrealizedPnL } from '../types';

const mockGetUnrealizedPnL = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getUnrealizedPnL: mockGetUnrealizedPnL,
    },
  },
}));

// eslint-disable-next-line import/first
import Engine from '../../../../core/Engine';

interface MockEngine {
  context: {
    PredictController?: {
      getUnrealizedPnL: jest.Mock;
    };
  } | null;
}

describe('useUnrealizedPnL', () => {
  const basePnL: UnrealizedPnL = {
    user: '0x1111111111111111111111111111111111111111',
    cashUpnl: 12.5,
    percentUpnl: 3.4,
  };

  const engine = Engine as unknown as MockEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine.context = {
      PredictController: {
        getUnrealizedPnL: mockGetUnrealizedPnL,
      },
    };
  });

  it('returns initial state when disabled', () => {
    const { result } = renderHook(() => useUnrealizedPnL({ enabled: false }));

    expect(result.current.unrealizedPnL).toBeNull();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe('function');
    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();
  });

  it('fetches unrealized P&L successfully with default options', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
      expect(result.current.unrealizedPnL).toEqual(basePnL);
      expect(result.current.error).toBeNull();
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledWith({
      address: undefined,
      providerId: undefined,
    });
  });

  it('passes provided options to getUnrealizedPnL', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { result } = renderHook(() =>
      useUnrealizedPnL({
        address: '0x2222222222222222222222222222222222222222',
        providerId: 'polymarket',
      }),
    );

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(basePnL);
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledWith({
      address: '0x2222222222222222222222222222222222222222',
      providerId: 'polymarket',
    });
  });

  it('handles null responses by clearing the data', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(null);

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('surfaces errors thrown by getUnrealizedPnL', async () => {
    mockGetUnrealizedPnL.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('maps non-Error rejections to a generic message', async () => {
    mockGetUnrealizedPnL.mockRejectedValue('bad times');

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch unrealized P&L');
    });
  });

  it('returns engine initialization error when context is missing', async () => {
    engine.context = null;

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.error).toBe('Engine not initialized');
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();
  });

  it('returns controller availability error when controller is missing', async () => {
    engine.context = {
      PredictController: undefined,
    } as unknown as MockEngine['context'];

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.error).toBe('Predict controller not available');
      expect(result.current.unrealizedPnL).toBeNull();
    });

    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();
  });

  it('supports manual refetching', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const updatedPnL: UnrealizedPnL = {
      user: '0x9999999999999999999999999999999999999999',
      cashUpnl: -5,
      percentUpnl: -2,
    };

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(basePnL);
    });

    mockGetUnrealizedPnL.mockResolvedValue(updatedPnL);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(updatedPnL);
      expect(result.current.error).toBeNull();
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledTimes(2);
  });

  it('honors enabled flag changes', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { result, rerender } = renderHook(
      ({ enabled }) => useUnrealizedPnL({ enabled }),
      {
        initialProps: { enabled: false },
      },
    );

    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(basePnL);
    });

    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  it('refetches when dependencies change', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { rerender } = renderHook(
      ({ address, providerId }: { address?: string; providerId?: string }) =>
        useUnrealizedPnL({ address, providerId }),
      {
        initialProps: {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          providerId: 'polymarket',
        },
      },
    );

    await waitFor(() => {
      expect(mockGetUnrealizedPnL).toHaveBeenCalledTimes(1);
    });

    rerender({
      address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      providerId: 'other-provider',
    });

    await waitFor(() => {
      expect(mockGetUnrealizedPnL).toHaveBeenCalledTimes(2);
    });

    expect(mockGetUnrealizedPnL).toHaveBeenNthCalledWith(1, {
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      providerId: 'polymarket',
    });
    expect(mockGetUnrealizedPnL).toHaveBeenNthCalledWith(2, {
      address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      providerId: 'other-provider',
    });
  });
});
