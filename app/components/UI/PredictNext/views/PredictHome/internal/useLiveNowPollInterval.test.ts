import {
  getLiveNowPollInterval,
  LIVE_NOW_POLL_MS,
  LIVE_NOW_SLOW_POLL_MS,
} from './useLiveNowPollInterval';

describe('getLiveNowPollInterval', () => {
  it.each([
    ['WIFI', LIVE_NOW_POLL_MS],
    ['FAST_CELLULAR', LIVE_NOW_POLL_MS],
    ['SLOW_CELLULAR', LIVE_NOW_SLOW_POLL_MS],
    ['NONE', undefined],
    [null, LIVE_NOW_POLL_MS],
  ] as const)('polls %s every %s ms', (networkTier, expected) => {
    expect(getLiveNowPollInterval(networkTier)).toBe(expected);
  });
});
