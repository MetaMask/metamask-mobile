import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useRWAToken } from './useRWAToken';
import { BridgeToken } from '../types';

const createState = (rwaEnabled: boolean) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          rwaTokensEnabled: rwaEnabled,
        },
        cacheTimestamp: 0,
      },
    },
  },
});

const createToken = (overrides: Partial<BridgeToken> = {}): BridgeToken => ({
  address: '0x0000000000000000000000000000000000000001',
  symbol: 'TEST',
  name: 'Test Token',
  image: 'https://example.com/token.png',
  decimals: 18,
  chainId: '0x1',
  ...overrides,
});

const mockRwaData = {
  rwaData: {
    market: {
      nextOpen: '2024-01-01T20:00:00.000Z',
      nextClose: '2024-01-01T11:00:00.000Z',
    },
    nextPause: {
      start: '2024-01-01T09:00:00.000Z',
      end: '2024-01-01T10:00:00.000Z',
    },
  } as BridgeToken['rwaData'],
};

describe('useRWAToken', () => {
  describe('isStockToken', () => {
    it('returns false when feature flag is disabled', () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(false),
      });
      const token = createToken({
        rwaData: {
          instrumentType: 'stock',
        } as BridgeToken['rwaData'],
      });

      const isStock = result.current.isStockToken(token);

      expect(isStock).toBe(false);
    });

    it('returns true when token instrument type is stock', () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          instrumentType: 'stock',
        } as BridgeToken['rwaData'],
      });

      const isStock = result.current.isStockToken(token);

      expect(isStock).toBe(true);
    });

    it('returns false when token instrument type is not stock', () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          instrumentType: 'bond',
        } as BridgeToken['rwaData'],
      });

      const isStock = result.current.isStockToken(token);

      expect(isStock).toBe(false);
    });

    it('returns false when token has no rwaData', () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken();
      const isStock = result.current.isStockToken(token);

      expect(isStock).toBe(false);
    });

    it('returns false when rwaData exists but instrumentType is missing', () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {} as BridgeToken['rwaData'],
      });
      const isStock = result.current.isStockToken(token);

      expect(isStock).toBe(false);
    });
  });

  describe('isTokenTradingOpen', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns true when feature flag is disabled', async () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(false),
      });
      const token = createToken(mockRwaData);
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns true when token has no rwaData', async () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken();
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns false when market open time is missing', async () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: null,
            nextClose: '2024-01-01T11:00:00.000Z',
          },
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns false when market close time is invalid', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: '2024-01-01T20:00:00.000Z',
            nextClose: 'not-a-date',
          },
        } as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns false when market open time is invalid', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: 'not-a-date',
            nextClose: '2024-01-01T12:00:00.000Z',
          },
        } as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns true when market is open without pause window', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T08:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken(mockRwaData);
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns false when current time is inside pause window', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T09:30:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken(mockRwaData);
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns false when pause start is missing and pause end is in the future', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:30:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          ...mockRwaData.rwaData,
          nextPause: {
            start: null,
            end: '2024-01-01T11:00:00.000Z',
          },
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns false when pause end is null but pause start is in the past', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T09:30:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          ...mockRwaData.rwaData,
          nextPause: {
            start: '2024-01-01T09:00:00.000Z',
            end: null,
          },
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns true when both pause start and end are null', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          ...mockRwaData.rwaData,
          nextPause: {
            start: null,
            end: null,
          },
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns true when pause start is null and pause end is in the past', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          ...mockRwaData.rwaData,
          nextPause: {
            start: null,
            end: '2024-01-01T09:00:00.000Z',
          },
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns false when market is closed before open time (normal case)', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T07:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: '2024-01-01T08:00:00.000Z',
            nextClose: '2024-01-01T12:00:00.000Z',
          },
          nextPause: null,
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns false when market is closed after close time', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T13:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: '2024-01-01T08:00:00.000Z',
            nextClose: '2024-01-01T12:00:00.000Z',
          },
          nextPause: null,
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns true when market is open during cross-day period (close < open)', async () => {
      jest.useFakeTimers();
      // Market closes at 11:00, opens at 20:00 (same day)
      // Current time is 22:00 (after open, before next day's close)
      jest.setSystemTime(new Date('2024-01-01T22:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: '2024-01-01T20:00:00.000Z',
            nextClose: '2024-01-01T11:00:00.000Z',
          },
          nextPause: null,
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns true when market is open during cross-day period (before close)', async () => {
      jest.useFakeTimers();
      // Market closes at 11:00, opens at 20:00 (same day)
      // Current time is 10:00 (before close, after previous day's open)
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: '2024-01-01T20:00:00.000Z',
            nextClose: '2024-01-01T11:00:00.000Z', // Close is before open (cross-day)
          },
          nextPause: null,
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns false when market is closed during gap in cross-day period', async () => {
      jest.useFakeTimers();
      // Market closes at 11:00, opens at 20:00 (same day)
      // Current time is 15:00 (in the gap between close and open)
      jest.setSystemTime(new Date('2024-01-01T15:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: '2024-01-01T20:00:00.000Z',
            nextClose: '2024-01-01T11:00:00.000Z', // Close is before open (cross-day)
          },
          nextPause: null,
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns true when exactly at market open time', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T20:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken(mockRwaData);
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns false when exactly at market close time', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T11:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken(mockRwaData);
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns false when exactly at pause start time', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T09:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken(mockRwaData);
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });

    it('returns true when exactly at pause end time', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken(mockRwaData);
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(true);
    });

    it('returns false when market close time is missing', async () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          market: {
            nextOpen: '2024-01-01T08:00:00.000Z',
            nextClose: null,
          },
        } as unknown as BridgeToken['rwaData'],
      });
      const isOpen = await result.current.isTokenTradingOpen(token);

      expect(isOpen).toBe(false);
    });
  });
});
