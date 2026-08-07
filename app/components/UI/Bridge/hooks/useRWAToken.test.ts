import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  useRWAToken,
  isTokenInOffHoursAt,
  isTokenTradableAt,
} from './useRWAToken';
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

  describe('isTokenMarketFullyClosed (hook wrapper)', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false for non-stock tokens', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T15:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: { instrumentType: 'bond' } as BridgeToken['rwaData'],
      });

      expect(result.current.isTokenMarketFullyClosed(token)).toBe(false);
    });

    it('returns false when stock token is in regular market hours', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          instrumentType: 'stock',
          market: {
            nextOpen: '2024-01-01T09:00:00.000Z',
            nextClose: '2024-01-01T17:00:00.000Z',
          },
        } as BridgeToken['rwaData'],
      });

      expect(result.current.isTokenMarketFullyClosed(token)).toBe(false);
    });

    it('returns false when stock token is in off-hours window', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T19:00:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          instrumentType: 'stock',
          market: {
            nextOpen: '2024-01-02T09:00:00.000Z',
            nextClose: '2024-01-02T17:00:00.000Z',
          },
          offhours: {
            nextOpen: '2024-01-01T17:30:00.000Z',
            nextClose: '2024-01-01T20:00:00.000Z',
          },
        } as BridgeToken['rwaData'],
      });

      expect(result.current.isTokenMarketFullyClosed(token)).toBe(false);
    });

    it('returns true when stock token has no regular hours and no off-hours', () => {
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          instrumentType: 'stock',
          market: {
            nextOpen: null,
            nextClose: null,
          },
        } as unknown as BridgeToken['rwaData'],
      });

      expect(result.current.isTokenMarketFullyClosed(token)).toBe(true);
    });

    it('returns true when stock token is between regular close and off-hours open', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T17:15:00.000Z'));
      const { result } = renderHookWithProvider(() => useRWAToken(), {
        state: createState(true),
      });
      const token = createToken({
        rwaData: {
          instrumentType: 'stock',
          market: {
            nextOpen: '2024-01-02T09:00:00.000Z',
            nextClose: '2024-01-01T17:00:00.000Z',
          },
          offhours: {
            nextOpen: '2024-01-01T17:30:00.000Z',
            nextClose: '2024-01-01T20:00:00.000Z',
          },
        } as BridgeToken['rwaData'],
      });

      expect(result.current.isTokenMarketFullyClosed(token)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Pure utility function tests (no hook rendering required)
// ---------------------------------------------------------------------------

describe('isTokenInOffHoursAt', () => {
  const token = (offhours: BridgeToken['rwaData']) =>
    ({
      address: '0x1',
      symbol: 'TEST',
      decimals: 18,
      chainId: '0x1',
      rwaData: offhours,
    }) as BridgeToken;

  it('returns false when isRwaEnabled is false', () => {
    const t = token({
      instrumentType: 'stock',
      offhours: {
        nextOpen: '2024-01-01T13:00:00Z',
        nextClose: '2024-01-01T16:00:00Z',
      },
    } as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, false, new Date('2024-01-01T14:00:00Z').getTime()),
    ).toBe(false);
  });

  it('returns false when token has no offhours field', () => {
    const t = token({ instrumentType: 'stock' } as BridgeToken['rwaData']);
    expect(isTokenInOffHoursAt(t, true, Date.now())).toBe(false);
  });

  it('returns false when offhours nextOpen is missing', () => {
    const t = token({
      instrumentType: 'stock',
      offhours: { nextOpen: null, nextClose: '2024-01-01T16:00:00Z' },
    } as unknown as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, true, new Date('2024-01-01T14:00:00Z').getTime()),
    ).toBe(false);
  });

  it('returns false when offhours nextClose is missing', () => {
    const t = token({
      instrumentType: 'stock',
      offhours: { nextOpen: '2024-01-01T13:00:00Z', nextClose: null },
    } as unknown as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, true, new Date('2024-01-01T14:00:00Z').getTime()),
    ).toBe(false);
  });

  it('returns true when inside simple (non-wraparound) window', () => {
    const t = token({
      instrumentType: 'stock',
      offhours: {
        nextOpen: '2024-01-01T13:00:00Z',
        nextClose: '2024-01-01T16:00:00Z',
      },
    } as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, true, new Date('2024-01-01T14:00:00Z').getTime()),
    ).toBe(true);
  });

  it('returns false when before simple window', () => {
    const t = token({
      instrumentType: 'stock',
      offhours: {
        nextOpen: '2024-01-01T13:00:00Z',
        nextClose: '2024-01-01T16:00:00Z',
      },
    } as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, true, new Date('2024-01-01T12:00:00Z').getTime()),
    ).toBe(false);
  });

  it('returns true when inside wraparound window (after open, before midnight)', () => {
    const t = token({
      instrumentType: 'stock',
      // nextClose (02:00) < nextOpen (22:00) → wraparound
      offhours: {
        nextOpen: '2024-01-01T22:00:00Z',
        nextClose: '2024-01-02T02:00:00Z',
      },
    } as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, true, new Date('2024-01-01T23:00:00Z').getTime()),
    ).toBe(true);
  });

  it('returns true when inside wraparound window (before close, after midnight)', () => {
    const t = token({
      instrumentType: 'stock',
      offhours: {
        nextOpen: '2024-01-01T22:00:00Z',
        nextClose: '2024-01-02T02:00:00Z',
      },
    } as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, true, new Date('2024-01-02T01:00:00Z').getTime()),
    ).toBe(true);
  });

  it('returns false during gap of wraparound window', () => {
    const t = token({
      instrumentType: 'stock',
      offhours: {
        nextOpen: '2024-01-01T22:00:00Z',
        nextClose: '2024-01-02T02:00:00Z',
      },
    } as BridgeToken['rwaData']);
    expect(
      isTokenInOffHoursAt(t, true, new Date('2024-01-01T12:00:00Z').getTime()),
    ).toBe(false);
  });
});

describe('isTokenTradableAt', () => {
  const makeToken = (
    overrides: Partial<BridgeToken['rwaData']> = {},
  ): BridgeToken =>
    ({
      address: '0x1',
      symbol: 'TEST',
      decimals: 18,
      chainId: '0x1',
      rwaData: {
        instrumentType: 'stock',
        ...overrides,
      } as BridgeToken['rwaData'],
    }) as BridgeToken;

  const NOW = new Date('2024-01-01T15:00:00Z').getTime();

  it('returns true for tokens without rwaData', () => {
    const t: BridgeToken = {
      address: '0x1',
      symbol: 'ETH',
      decimals: 18,
      chainId: '0x1',
    };
    expect(isTokenTradableAt(t, true, NOW)).toBe(true);
  });

  it('returns true when in regular market hours', () => {
    const t = makeToken({
      market: {
        nextOpen: '2024-01-01T09:00:00Z',
        nextClose: '2024-01-01T17:00:00Z',
      },
    });
    expect(isTokenTradableAt(t, true, NOW)).toBe(true);
  });

  it('returns false when paused during regular hours with no off-hours window to fall back to', () => {
    // 15:00 is inside the pause window and there is no off-hours window
    const t = makeToken({
      market: {
        nextOpen: '2024-01-01T09:00:00Z',
        nextClose: '2024-01-01T17:00:00Z',
      },
      nextPause: { start: '2024-01-01T14:00:00Z', end: '2024-01-01T16:00:00Z' },
    });
    expect(isTokenTradableAt(t, true, NOW)).toBe(false);
  });

  it('returns true when in off-hours window even though regular market is closed', () => {
    const t = makeToken({
      market: {
        nextOpen: '2024-01-02T09:00:00Z',
        nextClose: '2024-01-02T17:00:00Z',
      },
      offhours: {
        nextOpen: '2024-01-01T14:00:00Z',
        nextClose: '2024-01-01T16:00:00Z',
      },
    } as Partial<BridgeToken['rwaData']>);
    expect(isTokenTradableAt(t, true, NOW)).toBe(true);
  });

  it('returns true when in off-hours window even though pause is active during regular hours', () => {
    const t = makeToken({
      market: {
        nextOpen: '2024-01-01T09:00:00Z',
        nextClose: '2024-01-01T17:00:00Z',
      },
      nextPause: { start: '2024-01-01T14:00:00Z', end: '2024-01-01T16:00:00Z' },
      offhours: {
        nextOpen: '2024-01-01T14:00:00Z',
        nextClose: '2024-01-01T16:00:00Z',
      },
    } as Partial<BridgeToken['rwaData']>);
    // Pause blocks regular hours but off-hours is active → still tradable
    expect(isTokenTradableAt(t, true, NOW)).toBe(true);
  });

  it('returns false when neither regular hours nor off-hours are active', () => {
    const t = makeToken({
      market: {
        nextOpen: '2024-01-02T09:00:00Z',
        nextClose: '2024-01-02T17:00:00Z',
      },
      offhours: {
        nextOpen: '2024-01-02T17:30:00Z',
        nextClose: '2024-01-02T20:00:00Z',
      },
    } as Partial<BridgeToken['rwaData']>);
    expect(isTokenTradableAt(t, true, NOW)).toBe(false);
  });

  it('returns true when RWA feature flag is disabled (non-RWA treatment)', () => {
    const t = makeToken({
      market: {
        nextOpen: '2024-01-02T09:00:00Z',
        nextClose: '2024-01-02T17:00:00Z',
      },
    });
    expect(isTokenTradableAt(t, false, NOW)).toBe(true);
  });
});
