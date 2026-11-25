import { isRetryableStatus, parseRetryAfter } from './errors';

describe('isRetryableStatus', () => {
  it.each([
    [400, false],
    [401, false],
    [408, true],
    [429, true],
    [500, true],
    [599, true],
    [600, false],
  ])('classifies %s', (status, expected) => {
    expect(isRetryableStatus(status)).toBe(expected);
  });
});

describe('parseRetryAfter', () => {
  it.each([
    ['5', 5000],
    ['0', 0],
    ['-1', undefined],
    ['1.5', undefined],
    ['99999999999999999', undefined],
    [null, undefined],
    ['malformed', undefined],
    ['Wed, 25 Nov 2026 12:10:02 GMT', 2000],
    ['Wed, 25 Nov 2026 12:09:59 GMT', 0],
  ])('parses %s', (value, expected) => {
    expect(parseRetryAfter(value, Date.UTC(2026, 10, 25, 12, 10))).toBe(
      expected,
    );
  });
});
