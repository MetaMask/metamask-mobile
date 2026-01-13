import { renderHook, act } from '@testing-library/react-native';
import { useLiveGameUpdates } from './useLiveGameUpdates';
import { WebSocketManager } from '../providers/polymarket/WebSocketManager';
import { GameUpdate } from '../types';

jest.mock('../providers/polymarket/WebSocketManager');

describe('useLiveGameUpdates', () => {
  const mockSubscribeToGame = jest.fn();
  const mockGetConnectionStatus = jest.fn();
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (WebSocketManager.getInstance as jest.Mock).mockReturnValue({
      subscribeToGame: mockSubscribeToGame,
      getConnectionStatus: mockGetConnectionStatus.mockReturnValue({
        sportsConnected: true,
        marketConnected: false,
        gameSubscriptionCount: 1,
        priceSubscriptionCount: 0,
      }),
    });
    mockSubscribeToGame.mockReturnValue(mockUnsubscribe);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('subscription management', () => {
    it('subscribes to game updates when gameId is provided', () => {
      renderHook(() => useLiveGameUpdates('game123'));

      expect(mockSubscribeToGame).toHaveBeenCalledWith(
        'game123',
        expect.any(Function),
      );
    });

    it('does not subscribe when gameId is null', () => {
      renderHook(() => useLiveGameUpdates(null));

      expect(mockSubscribeToGame).not.toHaveBeenCalled();
    });

    it('does not subscribe when enabled is false', () => {
      renderHook(() => useLiveGameUpdates('game123', { enabled: false }));

      expect(mockSubscribeToGame).not.toHaveBeenCalled();
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() => useLiveGameUpdates('game123'));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('resubscribes when gameId changes', () => {
      const { rerender } = renderHook(
        ({ gameId }) => useLiveGameUpdates(gameId),
        { initialProps: { gameId: 'game123' } },
      );

      expect(mockSubscribeToGame).toHaveBeenCalledTimes(1);
      expect(mockSubscribeToGame).toHaveBeenCalledWith(
        'game123',
        expect.any(Function),
      );

      rerender({ gameId: 'game456' });

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockSubscribeToGame).toHaveBeenCalledTimes(2);
      expect(mockSubscribeToGame).toHaveBeenLastCalledWith(
        'game456',
        expect.any(Function),
      );
    });
  });

  describe('game update handling', () => {
    it('updates gameUpdate state when callback is invoked', () => {
      let capturedCallback: (update: GameUpdate) => void = jest.fn();
      mockSubscribeToGame.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      expect(result.current.gameUpdate).toBeNull();

      act(() => {
        capturedCallback({
          gameId: 'game123',
          score: '21-14',
          elapsed: '12:34',
          period: 'Q2',
          status: 'ongoing',
        });
      });

      expect(result.current.gameUpdate).toEqual({
        gameId: 'game123',
        score: '21-14',
        elapsed: '12:34',
        period: 'Q2',
        status: 'ongoing',
      });
    });

    it('updates lastUpdateTime when game update is received', () => {
      let capturedCallback: (update: GameUpdate) => void = jest.fn();
      mockSubscribeToGame.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const mockNow = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      expect(result.current.lastUpdateTime).toBeNull();

      act(() => {
        capturedCallback({
          gameId: 'game123',
          score: '21-14',
          elapsed: '12:34',
          period: 'Q2',
          status: 'ongoing',
        });
      });

      expect(result.current.lastUpdateTime).toBe(mockNow);
    });

    it('handles optional turn field in game update', () => {
      let capturedCallback: (update: GameUpdate) => void = jest.fn();
      mockSubscribeToGame.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      act(() => {
        capturedCallback({
          gameId: 'game123',
          score: '21-14',
          elapsed: '12:34',
          period: 'Q2',
          status: 'ongoing',
          turn: 'SEA',
        });
      });

      expect(result.current.gameUpdate?.turn).toBe('SEA');
    });
  });

  describe('connection status', () => {
    it('reflects connected status from WebSocketManager', () => {
      mockGetConnectionStatus.mockReturnValue({
        sportsConnected: true,
        marketConnected: false,
        gameSubscriptionCount: 1,
        priceSubscriptionCount: 0,
      });

      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      expect(result.current.isConnected).toBe(true);
    });

    it('reflects disconnected status from WebSocketManager', () => {
      mockGetConnectionStatus.mockReturnValue({
        sportsConnected: false,
        marketConnected: false,
        gameSubscriptionCount: 0,
        priceSubscriptionCount: 0,
      });

      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      expect(result.current.isConnected).toBe(false);
    });

    it('updates connection status on interval', () => {
      mockGetConnectionStatus
        .mockReturnValueOnce({ sportsConnected: true })
        .mockReturnValueOnce({ sportsConnected: false });

      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      expect(result.current.isConnected).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.isConnected).toBe(false);
    });

    it('clears interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useLiveGameUpdates('game123'));

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('initial state', () => {
    it('returns null gameUpdate initially', () => {
      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      expect(result.current.gameUpdate).toBeNull();
    });

    it('returns null lastUpdateTime initially', () => {
      const { result } = renderHook(() => useLiveGameUpdates('game123'));

      expect(result.current.lastUpdateTime).toBeNull();
    });

    it('resets state when disabled', () => {
      let capturedCallback: (update: GameUpdate) => void = jest.fn();
      mockSubscribeToGame.mockImplementation((_, callback) => {
        capturedCallback = callback;
        return mockUnsubscribe;
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useLiveGameUpdates('game123', { enabled }),
        { initialProps: { enabled: true } },
      );

      act(() => {
        capturedCallback({
          gameId: 'game123',
          score: '21-14',
          elapsed: '12:34',
          period: 'Q2',
          status: 'ongoing',
        });
      });

      expect(result.current.gameUpdate).not.toBeNull();

      rerender({ enabled: false });

      expect(result.current.gameUpdate).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });
});
