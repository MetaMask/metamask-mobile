import { tradeTimestampToMs } from './tradeTimestamp';

describe('tradeTimestampToMs', () => {
  it('scales a seconds timestamp to milliseconds', () => {
    // 2026-08-07T00:00:00Z in seconds.
    expect(tradeTimestampToMs(1786060800)).toBe(1786060800000);
  });

  it('passes a millisecond timestamp through unchanged', () => {
    expect(tradeTimestampToMs(1786060800000)).toBe(1786060800000);
  });

  it('treats the 1e12 boundary as already-milliseconds', () => {
    expect(tradeTimestampToMs(1e12)).toBe(1e12);
  });

  it('scales the value just below the boundary', () => {
    expect(tradeTimestampToMs(1e12 - 1)).toBe((1e12 - 1) * 1000);
  });

  it('passes zero through rather than scaling it', () => {
    expect(tradeTimestampToMs(0)).toBe(0);
  });

  it('passes a negative timestamp through untouched', () => {
    // Already invalid — scaling would turn one wrong instant into another.
    expect(tradeTimestampToMs(-5)).toBe(-5);
  });
});
