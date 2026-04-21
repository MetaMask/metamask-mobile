import { createE2EMockStreamManager } from './perps-controller-mixin';

/**
 * Contract tests for the E2E Perps stream manager stub.
 *
 * Production `PerpsStreamManager` channels expose sync `getSnapshot()` for cold-start reads.
 * Hooks such as `usePerpsMarkets`, `usePerpsLivePositions`, and `usePerpsLiveAccount` call
 * these on render. If the E2E mock omits them, the app throws `TypeError: undefined is not a function`
 * after login (see PR #27898).
 */

/** Root keys on `PerpsStreamManager` that the E2E plain-object mock must provide. */
const EXPECTED_E2E_STREAM_ROOT_KEYS = [
  'account',
  'candles',
  'fills',
  'marketData',
  'oiCaps',
  'orders',
  'positions',
  'prices',
  'topOfBook',
] as const;

/**
 * Channels that must implement synchronous `getSnapshot()` like `StreamChannel` in production.
 * Keep aligned with hooks that read `streamManager.<channel>.getSnapshot()` on mount.
 */
const CHANNELS_REQUIRING_GET_SNAPSHOT = [
  'prices',
  'marketData',
  'account',
  'orders',
  'positions',
] as const;

describe('createE2EMockStreamManager', () => {
  const mockConsoleLog = jest
    .spyOn(console, 'log')
    .mockImplementation(() => undefined);

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  it('returns an object whose top-level keys match the real PerpsStreamManager channel surface', () => {
    const manager = createE2EMockStreamManager() as Record<string, unknown>;

    const keys = Object.keys(manager).sort((a, b) => a.localeCompare(b));
    const expected = [...EXPECTED_E2E_STREAM_ROOT_KEYS].sort((a, b) =>
      a.localeCompare(b),
    );

    expect(keys).toEqual(expected);
  });

  it.each(CHANNELS_REQUIRING_GET_SNAPSHOT)(
    'channel %s exposes synchronous getSnapshot callable without throwing',
    (channel) => {
      const manager = createE2EMockStreamManager() as Record<
        string,
        { getSnapshot?: unknown }
      >;

      const snap = manager[channel]?.getSnapshot;

      expect(typeof snap).toBe('function');

      expect(() => (snap as () => unknown)()).not.toThrow();
    },
  );

  it('exposes marketData.refresh like production MarketDataChannel', () => {
    const manager = createE2EMockStreamManager() as {
      marketData: { refresh?: unknown };
    };

    expect(typeof manager.marketData.refresh).toBe('function');
  });
});
