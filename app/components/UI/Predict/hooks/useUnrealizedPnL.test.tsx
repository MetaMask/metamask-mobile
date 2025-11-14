import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useUnrealizedPnL } from './useUnrealizedPnL';
import { UnrealizedPnL } from '../types';

// Mock react-redux
const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockSelectedAddress),
}));

// Mock react-navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

const mockGetUnrealizedPnL = jest.fn();
const mockGetPositions = jest.fn();

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getUnrealizedPnL: mockGetUnrealizedPnL,
      getPositions: mockGetPositions,
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

// eslint-disable-next-line import/first
import Engine from '../../../../core/Engine';

interface MockEngine {
  context: {
    PredictController?: {
      getUnrealizedPnL: jest.Mock;
      getPositions: jest.Mock;
    };
    AccountTreeController?: {
      getAccountsFromSelectedAccountGroup: jest.Mock;
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
    // Default: return positions with at least one item so tests pass by default
    mockGetPositions.mockResolvedValue([{ id: 'position-1' }]);
    engine.context = {
      PredictController: {
        getUnrealizedPnL: mockGetUnrealizedPnL,
        getPositions: mockGetPositions,
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
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state when disabled', () => {
    const { result } = renderHook(() =>
      useUnrealizedPnL({ loadOnMount: false }),
    );

    expect(result.current.unrealizedPnL).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.loadUnrealizedPnL).toBe('function');
    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();
  });

  it('fetches unrealized P&L successfully with default options', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.unrealizedPnL).toEqual(basePnL);
      expect(result.current.error).toBeNull();
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledWith({
      address: mockSelectedAddress,
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
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('surfaces errors thrown by getUnrealizedPnL', async () => {
    mockGetUnrealizedPnL.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('maps non-Error rejections to a generic message', async () => {
    mockGetUnrealizedPnL.mockRejectedValue('bad times');

    const { result } = renderHook(() => useUnrealizedPnL());

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to fetch unrealized P&L');
    });
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
      await result.current.loadUnrealizedPnL();
    });

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(updatedPnL);
      expect(result.current.error).toBeNull();
    });

    expect(mockGetUnrealizedPnL).toHaveBeenCalledTimes(2);
  });

  it('loads data when loadOnMount changes from false to true', async () => {
    mockGetUnrealizedPnL.mockResolvedValue(basePnL);

    const { result, rerender } = renderHook(
      ({ loadOnMount }) => useUnrealizedPnL({ loadOnMount }),
      {
        initialProps: { loadOnMount: false },
      },
    );

    expect(mockGetUnrealizedPnL).not.toHaveBeenCalled();

    rerender({ loadOnMount: true });

    await waitFor(() => {
      expect(result.current.unrealizedPnL).toEqual(basePnL);
      expect(result.current.isLoading).toBe(false);
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

  describe('positions-based visibility', () => {
    it('returns null when user has no positions', async () => {
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);
      mockGetPositions.mockResolvedValue([]);

      const { result } = renderHook(() => useUnrealizedPnL());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockGetPositions).toHaveBeenCalledWith({
        providerId: undefined,
        limit: 1,
        offset: 0,
        claimable: false,
      });
    });

    it('returns unrealized P&L when user has positions', async () => {
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);
      mockGetPositions.mockResolvedValue([
        { id: 'position-1' },
        { id: 'position-2' },
      ]);

      const { result } = renderHook(() => useUnrealizedPnL());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toEqual(basePnL);
      expect(result.current.error).toBeNull();
    });

    it('calls getPositions with providerId when specified', async () => {
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);
      mockGetPositions.mockResolvedValue([{ id: 'position-1' }]);

      const { result } = renderHook(() =>
        useUnrealizedPnL({
          providerId: 'polymarket',
        }),
      );

      await waitFor(() => {
        expect(result.current.unrealizedPnL).toEqual(basePnL);
      });

      expect(mockGetPositions).toHaveBeenCalledWith({
        providerId: 'polymarket',
        limit: 1,
        offset: 0,
        claimable: false,
      });
    });

    it('returns null when getUnrealizedPnL returns null and user has positions', async () => {
      mockGetUnrealizedPnL.mockResolvedValue(null);
      mockGetPositions.mockResolvedValue([{ id: 'position-1' }]);

      const { result } = renderHook(() => useUnrealizedPnL());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('returns null when both getUnrealizedPnL and getPositions return empty', async () => {
      mockGetUnrealizedPnL.mockResolvedValue(null);
      mockGetPositions.mockResolvedValue([]);

      const { result } = renderHook(() => useUnrealizedPnL());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.unrealizedPnL).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('calls both getUnrealizedPnL and getPositions in parallel', async () => {
      mockGetUnrealizedPnL.mockResolvedValue(basePnL);
      mockGetPositions.mockResolvedValue([{ id: 'position-1' }]);

      renderHook(() => useUnrealizedPnL());

      await waitFor(() => {
        expect(mockGetUnrealizedPnL).toHaveBeenCalled();
        expect(mockGetPositions).toHaveBeenCalled();
      });

      expect(mockGetUnrealizedPnL).toHaveBeenCalledTimes(1);
      expect(mockGetPositions).toHaveBeenCalledTimes(1);
    });
  });
});
