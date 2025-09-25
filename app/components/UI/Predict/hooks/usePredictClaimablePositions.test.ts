import { act, renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePredictClaimablePositions } from './usePredictClaimablePositions';
import { usePredictTrading } from './usePredictTrading';
import { usePredictClaim } from './usePredictClaim';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import type { PredictPosition } from '../types';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('./usePredictTrading');
jest.mock('./usePredictClaim');

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      clearClaimTransactions: jest.fn(),
    },
  },
}));

const mockUsePredictTrading = usePredictTrading as jest.Mock;
const mockUsePredictClaim = usePredictClaim as jest.Mock;
const mockUseSelector = useSelector as jest.Mock;
const mockUseFocusEffect = useFocusEffect as jest.Mock;
const mockClearClaimTransactions = Engine.context.PredictController
  .clearClaimTransactions as jest.Mock;

const MOCK_ADDRESS = '0x123';
const MOCK_PROVIDER_ID = 'polymarket';

const MOCK_POSITION_1: PredictPosition = {
  id: 'pos-1',
  conditionId: 'cond-1',
  size: 100,
  curPrice: 0.5,
  outcomeIndex: 0,
  providerId: MOCK_PROVIDER_ID,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcome: 'outcome-name-1',
  outcomeTokenId: 'token-1',
  title: 'title-1',
  icon: 'icon-1',
  amount: 10,
  price: 0.5,
  status: 'open',
  redeemable: false,
  initialValue: 5,
  avgPrice: 0.5,
  currentValue: 5,
  endDate: '2025-12-31',
  percentPnl: 0,
  cashPnl: 0,
};

const MOCK_POSITION_2: PredictPosition = {
  id: 'pos-2',
  conditionId: 'cond-2',
  size: 200,
  curPrice: 0.8,
  outcomeIndex: 1,
  providerId: MOCK_PROVIDER_ID,
  marketId: 'market-2',
  outcomeId: 'outcome-2',
  outcome: 'outcome-name-2',
  outcomeTokenId: 'token-2',
  title: 'title-2',
  icon: 'icon-2',
  amount: 20,
  price: 0.4,
  status: 'open',
  redeemable: false,
  initialValue: 8,
  avgPrice: 0.4,
  currentValue: 16,
  endDate: '2025-12-31',
  percentPnl: 100,
  cashPnl: 8,
};

const MOCK_CLAIMED_POSITION: PredictPosition = {
  id: 'claimed-pos-1',
  conditionId: 'cond-claimed-1',
  size: 50,
  curPrice: 1,
  outcomeIndex: 0,
  providerId: MOCK_PROVIDER_ID,
  marketId: 'market-claimed-1',
  outcomeId: 'outcome-claimed-1',
  outcome: 'outcome-name-claimed-1',
  outcomeTokenId: 'token-claimed-1',
  title: 'title-claimed-1',
  icon: 'icon-claimed-1',
  amount: 5,
  price: 1,
  status: 'redeemable',
  redeemable: true,
  initialValue: 5,
  avgPrice: 1,
  currentValue: 5,
  endDate: '2025-01-01',
  percentPnl: 0,
  cashPnl: 0,
};

describe('usePredictClaimablePositions', () => {
  let mockGetPositions: jest.Mock;
  const completedClaimPositionIds = new Set<string>();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    completedClaimPositionIds.clear();
    mockGetPositions = jest.fn();
    mockUsePredictTrading.mockReturnValue({ getPositions: mockGetPositions });
    mockUsePredictClaim.mockReturnValue({
      completedClaimPositionIds,
    });
    mockUseSelector.mockReturnValue(MOCK_ADDRESS);
    mockUseFocusEffect.mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial state correctly', () => {
    const { result } = renderHook(() =>
      usePredictClaimablePositions({ loadOnMount: false }),
    );

    expect(result.current.claimablePositions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not load positions if loadOnMount is false', () => {
    renderHook(() =>
      usePredictClaimablePositions({
        providerId: MOCK_PROVIDER_ID,
        loadOnMount: false,
      }),
    );
    expect(mockGetPositions).not.toHaveBeenCalled();
  });

  it('should load positions successfully on mount', async () => {
    mockGetPositions.mockResolvedValue([MOCK_POSITION_1]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictClaimablePositions({ providerId: MOCK_PROVIDER_ID }),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.claimablePositions).toEqual([MOCK_POSITION_1]);
    expect(mockGetPositions).toHaveBeenCalledWith({
      address: MOCK_ADDRESS,
      providerId: MOCK_PROVIDER_ID,
      claimable: true,
    });
  });

  it('should handle errors when fetching positions', async () => {
    const error = new Error('Failed to fetch');
    mockGetPositions.mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictClaimablePositions({ providerId: MOCK_PROVIDER_ID }),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(error.message);
    expect(result.current.claimablePositions).toEqual([]);
  });

  it('should refresh positions on focus', async () => {
    mockGetPositions.mockResolvedValueOnce([]); // Initial load
    mockGetPositions.mockResolvedValueOnce([MOCK_POSITION_1]); // Refresh

    const { waitForNextUpdate } = renderHook(() =>
      usePredictClaimablePositions({
        providerId: MOCK_PROVIDER_ID,
        refreshOnFocus: true,
      }),
    );
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(mockGetPositions).toHaveBeenCalledTimes(1);

    // Simulate focus by calling the effect callback
    const focusCallback = mockUseFocusEffect.mock.calls[0][0];
    await act(async () => {
      focusCallback();
    });

    // initial load + refresh on focus
    expect(mockGetPositions).toHaveBeenCalledTimes(2);
  });

  describe('retry logic', () => {
    it('should retry if initial positions contain claimed ones and succeed on first retry', async () => {
      completedClaimPositionIds.add(MOCK_CLAIMED_POSITION.id);

      mockGetPositions
        .mockResolvedValueOnce([MOCK_CLAIMED_POSITION, MOCK_POSITION_1])
        .mockResolvedValueOnce([MOCK_POSITION_1, MOCK_POSITION_2]);

      const { result } = renderHook(() =>
        usePredictClaimablePositions({ providerId: MOCK_PROVIDER_ID }),
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });

      await waitFor(() => {
        expect(result.current.claimablePositions).toEqual([
          MOCK_POSITION_1,
          MOCK_POSITION_2,
        ]);
      });
      expect(mockGetPositions).toHaveBeenCalledTimes(2);
      expect(mockClearClaimTransactions).toHaveBeenCalledTimes(1);
    });

    it('should succeed on the last retry attempt', async () => {
      completedClaimPositionIds.add(MOCK_CLAIMED_POSITION.id);

      mockGetPositions
        .mockResolvedValueOnce([MOCK_CLAIMED_POSITION]) // Initial
        .mockResolvedValueOnce([MOCK_CLAIMED_POSITION]) // Retry 1
        .mockResolvedValueOnce([MOCK_CLAIMED_POSITION]) // Retry 2
        .mockResolvedValueOnce([MOCK_POSITION_1]); // Retry 3

      const { result } = renderHook(() =>
        usePredictClaimablePositions({ providerId: MOCK_PROVIDER_ID }),
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000 * 3);
      });

      await waitFor(() => {
        expect(result.current.claimablePositions).toEqual([MOCK_POSITION_1]);
      });

      expect(mockGetPositions).toHaveBeenCalledTimes(4);
      expect(mockClearClaimTransactions).toHaveBeenCalledTimes(1);
    });

    it('should return positions with claimed ones if all retries fail', async () => {
      completedClaimPositionIds.add(MOCK_CLAIMED_POSITION.id);

      mockGetPositions.mockResolvedValue([
        MOCK_CLAIMED_POSITION,
        MOCK_POSITION_1,
      ]);

      const { result } = renderHook(() =>
        usePredictClaimablePositions({ providerId: MOCK_PROVIDER_ID }),
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000 * 3);
      });

      await waitFor(() => {
        expect(result.current.claimablePositions).toEqual([MOCK_POSITION_1]);
      });
      expect(mockGetPositions).toHaveBeenCalledTimes(4); // initial + 3 retries
      expect(mockClearClaimTransactions).not.toHaveBeenCalled();
    });
  });

  it('should filter out completed positions', async () => {
    completedClaimPositionIds.add(MOCK_POSITION_1.id);
    mockGetPositions.mockResolvedValue([MOCK_POSITION_1, MOCK_POSITION_2]);

    const { result } = renderHook(() =>
      usePredictClaimablePositions({ providerId: MOCK_PROVIDER_ID }),
    );

    // This triggers retries because a completed position is found
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3000 * 3);
    });

    await waitFor(() => {
      // After retries fail, the original list is filtered by useMemo
      expect(result.current.claimablePositions).toEqual([MOCK_POSITION_2]);
    });
  });

  it('should only return the first claimable position', async () => {
    mockGetPositions.mockResolvedValue([MOCK_POSITION_1, MOCK_POSITION_2]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictClaimablePositions({ providerId: MOCK_PROVIDER_ID }),
    );

    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.claimablePositions).toEqual([MOCK_POSITION_1]);
    expect(result.current.claimablePositions.length).toBe(1);
  });
});
