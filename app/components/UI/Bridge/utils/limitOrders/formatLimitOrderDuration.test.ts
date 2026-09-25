import {
  formatLimitOrderExpiredDuration,
  formatLimitOrderTimeLeft,
} from './formatLimitOrderDuration';

describe('formatLimitOrderExpiredDuration', () => {
  it('formats the number of days between creation and expiry', () => {
    expect(
      formatLimitOrderExpiredDuration(
        '2026-09-03T12:00:00.000Z',
        '2026-09-06T12:00:00.000Z',
      ),
    ).toBe('3d');
  });

  it('formats a one-hour window in hours', () => {
    expect(
      formatLimitOrderExpiredDuration(
        '2026-09-03T12:00:00.000Z',
        '2026-09-03T13:00:00.000Z',
      ),
    ).toBe('1h');
  });

  it('formats a ten-minute window in minutes', () => {
    expect(
      formatLimitOrderExpiredDuration(
        '2026-09-03T12:00:00.000Z',
        '2026-09-03T12:10:00.000Z',
      ),
    ).toBe('10m');
  });

  it('does not round a partial day up to a whole day', () => {
    expect(
      formatLimitOrderExpiredDuration(
        '2026-09-03T12:00:00.000Z',
        '2026-09-04T01:00:00.000Z',
      ),
    ).toBe('13h');
  });

  it('clamps to zero for an unparsable timestamp', () => {
    expect(
      formatLimitOrderExpiredDuration('not-a-date', '2026-09-06T12:00:00.000Z'),
    ).toBe('0m');
  });
});

describe('formatLimitOrderTimeLeft', () => {
  it('formats the days remaining until expiry', () => {
    expect(
      formatLimitOrderTimeLeft(
        '2026-09-27T12:00:00.000Z',
        new Date('2026-09-20T12:00:00.000Z'),
      ),
    ).toBe('7d left');
  });

  it('formats the hours remaining for a sub-day expiry', () => {
    expect(
      formatLimitOrderTimeLeft(
        '2026-09-20T14:30:00.000Z',
        new Date('2026-09-20T12:00:00.000Z'),
      ),
    ).toBe('2h left');
  });

  it('formats the minutes remaining for a sub-hour expiry', () => {
    expect(
      formatLimitOrderTimeLeft(
        '2026-09-20T12:10:00.000Z',
        new Date('2026-09-20T12:00:00.000Z'),
      ),
    ).toBe('10m left');
  });

  it('rounds a partial minute up so it still counts', () => {
    expect(
      formatLimitOrderTimeLeft(
        '2026-09-20T12:00:30.000Z',
        new Date('2026-09-20T12:00:00.000Z'),
      ),
    ).toBe('1m left');
  });

  it('clamps to zero once the order has already expired', () => {
    expect(
      formatLimitOrderTimeLeft(
        '2026-09-06T12:00:00.000Z',
        new Date('2026-09-20T12:00:00.000Z'),
      ),
    ).toBe('0m left');
  });
});
