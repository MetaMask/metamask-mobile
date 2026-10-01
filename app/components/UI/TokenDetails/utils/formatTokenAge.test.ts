import { formatTokenAge } from './formatTokenAge';

describe('formatTokenAge', () => {
  const NOW = Date.parse('2026-10-01T00:00:00Z');

  it.each([
    [undefined, null],
    [null, null],
    ['', null],
    ['not-a-date', null],
    ['2027-01-01T00:00:00Z', null],
  ])('returns null for %p', (input, expected) => {
    expect(formatTokenAge(input, NOW)).toStrictEqual(expected);
  });

  it.each([
    ['2026-09-30T12:00:00Z', '1d'],
    ['2026-09-29T00:00:00Z', '2d'],
    ['2026-09-25T00:00:00Z', '6d'],
    ['2026-09-20T00:00:00Z', '1w'],
    ['2026-09-10T00:00:00Z', '3w'],
    ['2026-08-01T00:00:00Z', '2mo'],
    ['2025-10-01T00:00:00Z', '1y'],
    ['2023-01-01T00:00:00Z', '3y'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatTokenAge(input, NOW)).toStrictEqual(expected);
  });
});
