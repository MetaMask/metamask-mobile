import { nextWaitingPollDelayMs } from './waitingPoll';

describe('nextWaitingPollDelayMs', () => {
  it('reads every 5 seconds for the first minute', () => {
    expect(nextWaitingPollDelayMs(0)).toBe(5000);
    expect(nextWaitingPollDelayMs(11)).toBe(5000);
  });

  it('then every 15 seconds', () => {
    expect(nextWaitingPollDelayMs(12)).toBe(15000);
    expect(nextWaitingPollDelayMs(35)).toBe(15000);
  });

  it('then every 30 seconds, for as long as the screen waits', () => {
    expect(nextWaitingPollDelayMs(36)).toBe(30000);
    expect(nextWaitingPollDelayMs(1000)).toBe(30000);
  });

  it('never gets faster as the wait goes on', () => {
    let previous = 0;
    for (let reads = 0; reads < 100; reads += 1) {
      const delay = nextWaitingPollDelayMs(reads);
      expect(delay).toBeGreaterThanOrEqual(previous);
      previous = delay;
    }
  });
});
