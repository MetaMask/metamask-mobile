import { parseIsoTimestamp } from './parseIsoTimestamp';

describe('parseIsoTimestamp', () => {
  it('parses valid ISO timestamps', () => {
    expect(parseIsoTimestamp('2026-11-09T00:00:00.000Z')).toBe(
      Date.parse('2026-11-09T00:00:00.000Z'),
    );
  });

  it.each([
    undefined,
    null,
    'not-a-date',
    '2026-02-29T00:00:00.000Z',
    '2026-02-31T00:00:00.000Z',
  ])('rejects invalid ISO timestamps: %s', (value) => {
    expect(parseIsoTimestamp(value)).toBeUndefined();
  });
});
