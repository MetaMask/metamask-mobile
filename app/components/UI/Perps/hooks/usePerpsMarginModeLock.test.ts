import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { selectPerpsNetwork } from '../selectors/perpsController';
import { usePerpsMarginModeLock } from './usePerpsMarginModeLock';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getMarginModeLock: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.Mock;
const mockGetMarginModeLock = Engine.context.PerpsController
  .getMarginModeLock as jest.Mock;

const LOCKED_CROSS = {
  status: 'locked',
  providerId: 'hyperliquid',
  marginMode: 'cross',
  reason: 'open_order',
} as const;
const UNLOCKED = { status: 'unlocked', providerId: 'hyperliquid' } as const;

let mockSelectedAddress = '0xaccount-a';
let mockPerpsNetwork = 'testnet';

const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

describe('usePerpsMarginModeLock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedAddress = '0xaccount-a';
    mockPerpsNetwork = 'testnet';
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectPerpsNetwork) {
        return mockPerpsNetwork;
      }
      return undefined;
    });
    mockGetMarginModeLock.mockResolvedValue(LOCKED_CROSS);
  });

  it('reads the venue lock for the market route', async () => {
    const { result } = renderHook(() =>
      usePerpsMarginModeLock({
        symbol: 'BTC',
        providerId: 'hyperliquid',
        enabled: true,
      }),
    );

    await waitFor(() => expect(result.current.lock).toEqual(LOCKED_CROSS));
    expect(result.current.isResolved).toBe(true);
    expect(mockGetMarginModeLock).toHaveBeenCalledWith({
      symbol: 'BTC',
      providerId: 'hyperliquid',
    });
  });

  it('skips the venue read when disabled', () => {
    const { result } = renderHook(() =>
      usePerpsMarginModeLock({ symbol: 'BTC', enabled: false }),
    );

    expect(mockGetMarginModeLock).not.toHaveBeenCalled();
    expect(result.current.lock).toBeNull();
    expect(result.current.isResolved).toBe(false);
  });

  it('reports the lock as unknown while a refresh is pending', async () => {
    const { result } = renderHook(() =>
      usePerpsMarginModeLock({ symbol: 'BTC', enabled: true }),
    );
    await waitFor(() => expect(result.current.isResolved).toBe(true));
    const pendingRead = deferred<typeof UNLOCKED>();
    mockGetMarginModeLock.mockReturnValueOnce(pendingRead.promise);

    act(() => {
      result.current.refresh();
    });

    expect(result.current.lock).toBeNull();
    expect(result.current.isResolved).toBe(false);
    await act(async () => {
      pendingRead.resolve(UNLOCKED);
    });
    expect(result.current.lock).toEqual(UNLOCKED);
    expect(result.current.isResolved).toBe(true);
  });

  it.each([
    [
      'account',
      () => {
        mockSelectedAddress = '0xaccount-b';
      },
    ],
    [
      'network',
      () => {
        mockPerpsNetwork = 'mainnet';
      },
    ],
  ])(
    'drops the previous %s lock while the next read is pending',
    async (_context, switchContext) => {
      const { result, rerender } = renderHook(() =>
        usePerpsMarginModeLock({ symbol: 'BTC', enabled: true }),
      );
      await waitFor(() => expect(result.current.lock).toEqual(LOCKED_CROSS));
      const pendingRead = deferred<typeof UNLOCKED>();
      mockGetMarginModeLock.mockReturnValueOnce(pendingRead.promise);

      switchContext();
      rerender({});

      expect(result.current.lock).toBeNull();
      expect(result.current.isResolved).toBe(false);
      await act(async () => {
        pendingRead.resolve(UNLOCKED);
      });
      expect(result.current.lock).toEqual(UNLOCKED);
      expect(mockGetMarginModeLock).toHaveBeenCalledTimes(2);
    },
  );

  it('re-reads the lock when the refresh key changes', async () => {
    const { rerender } = renderHook(
      ({ refreshKey }: { refreshKey?: string }) =>
        usePerpsMarginModeLock({ symbol: 'BTC', enabled: true, refreshKey }),
      { initialProps: { refreshKey: undefined } as { refreshKey?: string } },
    );
    await waitFor(() => expect(mockGetMarginModeLock).toHaveBeenCalledTimes(1));

    rerender({ refreshKey: 'cross' });

    await waitFor(() => expect(mockGetMarginModeLock).toHaveBeenCalledTimes(2));
  });

  it('keeps an unavailable answer unresolved', async () => {
    const unavailable = {
      status: 'unavailable',
      providerId: 'hyperliquid',
      reason: 'provider_unavailable',
    } as const;
    mockGetMarginModeLock.mockResolvedValue(unavailable);

    const { result } = renderHook(() =>
      usePerpsMarginModeLock({ symbol: 'BTC', enabled: true }),
    );

    await waitFor(() => expect(result.current.lock).toEqual(unavailable));
    expect(result.current.isResolved).toBe(false);
  });

  it('keeps the lock unknown when the read fails', async () => {
    mockGetMarginModeLock.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      usePerpsMarginModeLock({ symbol: 'BTC', enabled: true }),
    );

    await waitFor(() => expect(mockGetMarginModeLock).toHaveBeenCalled());
    expect(result.current.lock).toBeNull();
    expect(result.current.isResolved).toBe(false);
  });
});
