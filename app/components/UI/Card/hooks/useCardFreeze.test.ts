import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import useCardFreeze from './useCardFreeze';
import { CardStatus } from '../types';
import { CardSDK } from '../sdk/CardSDK';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useCardFreeze', () => {
  const mockFreezeCard = jest.fn();
  const mockUnfreezeCard = jest.fn();
  const mockFetchCardDetails = jest.fn();

  const mockSDK = {
    freezeCard: mockFreezeCard,
    unfreezeCard: mockUnfreezeCard,
  } as unknown as CardSDK;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    mockFreezeCard.mockResolvedValue({ success: true });
    mockUnfreezeCard.mockResolvedValue({ success: true });
    mockFetchCardDetails.mockResolvedValue(null);
  });

  describe('Initial State', () => {
    it('returns isFrozen false and idle status when card is ACTIVE', () => {
      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.isFrozen).toBe(false);
      expect(result.current.status).toEqual({ type: 'idle' });
    });

    it('returns isFrozen true and idle status when card is FROZEN', () => {
      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.FROZEN,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.isFrozen).toBe(true);
      expect(result.current.status).toEqual({ type: 'idle' });
    });

    it('returns isFrozen false when card status is undefined', () => {
      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: undefined,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.isFrozen).toBe(false);
    });
  });

  describe('Freeze Card', () => {
    it('calls freezeCard and triggers card details refresh when card is ACTIVE', async () => {
      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(mockFreezeCard).toHaveBeenCalledTimes(1);
      expect(mockUnfreezeCard).not.toHaveBeenCalled();
      expect(mockFetchCardDetails).toHaveBeenCalledTimes(1);
      expect(result.current.status).toEqual({ type: 'idle' });
    });

    it('transitions to toggling status during freeze operation', async () => {
      let resolveFreeze: () => void = () => undefined;
      mockFreezeCard.mockReturnValue(
        new Promise<{ success: boolean }>((resolve) => {
          resolveFreeze = () => resolve({ success: true });
        }),
      );

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.status.type).toBe('idle');

      let togglePromise: Promise<void>;
      act(() => {
        togglePromise = result.current.toggleFreeze();
      });

      expect(result.current.status).toEqual({ type: 'toggling' });

      await act(async () => {
        resolveFreeze();
        await togglePromise;
      });

      expect(result.current.status).toEqual({ type: 'idle' });
    });
  });

  describe('Unfreeze Card', () => {
    it('calls unfreezeCard and triggers card details refresh when card is FROZEN', async () => {
      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.FROZEN,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(mockUnfreezeCard).toHaveBeenCalledTimes(1);
      expect(mockFreezeCard).not.toHaveBeenCalled();
      expect(mockFetchCardDetails).toHaveBeenCalledTimes(1);
      expect(result.current.status).toEqual({ type: 'idle' });
    });
  });

  describe('Optimistic Update', () => {
    it('shows frozen state immediately when freezing an ACTIVE card', async () => {
      let resolveFreeze: () => void = () => undefined;
      mockFreezeCard.mockReturnValue(
        new Promise<{ success: boolean }>((resolve) => {
          resolveFreeze = () => resolve({ success: true });
        }),
      );

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.isFrozen).toBe(false);

      let togglePromise: Promise<void>;
      act(() => {
        togglePromise = result.current.toggleFreeze();
      });

      expect(result.current.isFrozen).toBe(true);

      await act(async () => {
        resolveFreeze();
        await togglePromise;
      });
    });

    it('shows active state immediately when unfreezing a FROZEN card', async () => {
      let resolveUnfreeze: () => void = () => undefined;
      mockUnfreezeCard.mockReturnValue(
        new Promise<{ success: boolean }>((resolve) => {
          resolveUnfreeze = () => resolve({ success: true });
        }),
      );

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.FROZEN,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.isFrozen).toBe(true);

      let togglePromise: Promise<void>;
      act(() => {
        togglePromise = result.current.toggleFreeze();
      });

      expect(result.current.isFrozen).toBe(false);

      await act(async () => {
        resolveUnfreeze();
        await togglePromise;
      });
    });

    it('reverts to original state when freeze API call fails', async () => {
      mockFreezeCard.mockRejectedValue(new Error('Freeze failed'));

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.isFrozen).toBe(false);

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.isFrozen).toBe(false);
      expect(result.current.status).toEqual({
        type: 'error',
        error: expect.objectContaining({ message: 'Freeze failed' }),
      });
    });

    it('reverts to original state when unfreeze API call fails', async () => {
      mockUnfreezeCard.mockRejectedValue(new Error('Unfreeze failed'));

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.FROZEN,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      expect(result.current.isFrozen).toBe(true);

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.isFrozen).toBe(true);
      expect(result.current.status).toEqual({
        type: 'error',
        error: expect.objectContaining({ message: 'Unfreeze failed' }),
      });
    });

    it('keeps optimistic state when fetchCardDetails silently fails', async () => {
      mockFetchCardDetails.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      // cardStatus prop is still ACTIVE (fetchCardDetails didn't update it),
      // but optimistic state keeps showing FROZEN (matching the backend).
      expect(result.current.isFrozen).toBe(true);
      expect(result.current.status).toEqual({ type: 'idle' });
    });

    it('clears optimistic state when cardStatus prop catches up', async () => {
      const { result, rerender } = renderHook(
        ({ cardStatus }) =>
          useCardFreeze({
            cardStatus,
            fetchCardDetails: mockFetchCardDetails,
          }),
        { initialProps: { cardStatus: CardStatus.ACTIVE as CardStatus } },
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.isFrozen).toBe(true);

      // Simulate cardStatus prop updating to FROZEN (e.g., from successful cache refresh)
      rerender({ cardStatus: CardStatus.FROZEN });

      expect(result.current.isFrozen).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('transitions to error status when freezeCard fails', async () => {
      const freezeError = new Error('Freeze failed');
      mockFreezeCard.mockRejectedValue(freezeError);

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.status).toEqual({
        type: 'error',
        error: freezeError,
      });
      expect(mockFetchCardDetails).not.toHaveBeenCalled();
    });

    it('transitions to error status when unfreezeCard fails', async () => {
      const unfreezeError = new Error('Unfreeze failed');
      mockUnfreezeCard.mockRejectedValue(unfreezeError);

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.FROZEN,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.status).toEqual({
        type: 'error',
        error: unfreezeError,
      });
      expect(mockFetchCardDetails).not.toHaveBeenCalled();
    });

    it('wraps non-Error thrown values', async () => {
      mockFreezeCard.mockRejectedValue('string error');

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.status.type).toBe('error');
      if (result.current.status.type === 'error') {
        expect(result.current.status.error).toBeInstanceOf(Error);
        expect(result.current.status.error.message).toBe('Unknown error');
      }
    });

    it('resets to toggling then idle on retry after error', async () => {
      mockFreezeCard
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.status.type).toBe('error');

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(result.current.status).toEqual({ type: 'idle' });
    });
  });

  describe('Guard Conditions', () => {
    it('does nothing when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.ACTIVE,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(mockFreezeCard).not.toHaveBeenCalled();
      expect(mockUnfreezeCard).not.toHaveBeenCalled();
      expect(mockFetchCardDetails).not.toHaveBeenCalled();
    });

    it('does nothing when card status is BLOCKED', async () => {
      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: CardStatus.BLOCKED,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(mockFreezeCard).not.toHaveBeenCalled();
      expect(mockUnfreezeCard).not.toHaveBeenCalled();
      expect(mockFetchCardDetails).not.toHaveBeenCalled();
    });

    it('does nothing when card status is undefined', async () => {
      const { result } = renderHook(() =>
        useCardFreeze({
          cardStatus: undefined,
          fetchCardDetails: mockFetchCardDetails,
        }),
      );

      await act(async () => {
        await result.current.toggleFreeze();
      });

      expect(mockFreezeCard).not.toHaveBeenCalled();
      expect(mockUnfreezeCard).not.toHaveBeenCalled();
      expect(mockFetchCardDetails).not.toHaveBeenCalled();
    });
  });
});
