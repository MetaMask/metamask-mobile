import {
  DEPOSIT_POLL_DELAYS_MS,
  DEPOSIT_POLL_MAX_DURATION_MS,
  DEPOSIT_SLOW_NETWORK_MULTIPLIER,
  depositPollDelayMs,
} from './depositPolling';

describe('depositPollDelayMs', () => {
  it('backs off from 2s to 30s on standard networks', () => {
    expect(DEPOSIT_POLL_DELAYS_MS).toEqual([
      2_000, 4_000, 8_000, 16_000, 30_000,
    ]);
    expect(DEPOSIT_POLL_MAX_DURATION_MS).toBe(600_000);

    expect(depositPollDelayMs(0, 'WIFI')).toBe(2_000);
    expect(depositPollDelayMs(1, 'WIFI')).toBe(4_000);
    expect(depositPollDelayMs(2, 'FAST_CELLULAR')).toBe(8_000);
    expect(depositPollDelayMs(3, 'FAST_CELLULAR')).toBe(16_000);
    expect(depositPollDelayMs(4, 'WIFI')).toBe(30_000);
    expect(depositPollDelayMs(9, 'WIFI')).toBe(30_000);
  });

  it('doubles the backoff delay on SLOW_CELLULAR', () => {
    expect(depositPollDelayMs(0, 'SLOW_CELLULAR')).toBe(
      2_000 * DEPOSIT_SLOW_NETWORK_MULTIPLIER,
    );
    expect(depositPollDelayMs(4, 'SLOW_CELLULAR')).toBe(
      30_000 * DEPOSIT_SLOW_NETWORK_MULTIPLIER,
    );
  });

  it('stops polling when offline', () => {
    expect(depositPollDelayMs(0, 'NONE')).toBeNull();
    expect(depositPollDelayMs(3, 'NONE')).toBeNull();
  });

  it('falls back to the product default when network tier is null', () => {
    expect(depositPollDelayMs(0, null)).toBe(2_000);
    expect(depositPollDelayMs(2, null)).toBe(8_000);
  });
});
