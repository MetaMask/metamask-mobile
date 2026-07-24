import reducer, {
  TERMINAL_ORDER_ANALYTICS_TTL_MS,
  clearTerminalOrderAnalyticsEntries,
  markTerminalOrderAnalyticsEmittedEntry,
  type TerminalOrderAnalyticsState,
} from './terminalOrderAnalytics';

describe('terminalOrderAnalytics slice', () => {
  const NOW = 1_700_000_000_000;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores an emitted terminal order key with a timestamp', () => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);

    const state = reducer(
      undefined,
      markTerminalOrderAnalyticsEmittedEntry('order-1'),
    );

    expect(state).toEqual({ 'order-1': NOW });
  });

  it('clears all emitted terminal order keys', () => {
    const initial: TerminalOrderAnalyticsState = {
      'order-1': NOW,
      'order-2': NOW,
    };

    expect(reducer(initial, clearTerminalOrderAnalyticsEntries())).toEqual({});
  });

  it('evicts entries older than the TTL on write', () => {
    const stale: TerminalOrderAnalyticsState = {
      'stale-order': NOW - TERMINAL_ORDER_ANALYTICS_TTL_MS - 1,
      'fresh-order': NOW - 1000,
    };
    jest.spyOn(Date, 'now').mockReturnValue(NOW);

    const state = reducer(
      stale,
      markTerminalOrderAnalyticsEmittedEntry('new-order'),
    );

    expect(state).toEqual({
      'fresh-order': NOW - 1000,
      'new-order': NOW,
    });
  });
});
