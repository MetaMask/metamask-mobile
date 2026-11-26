import { isEeaCountry } from './eeaCountries';

describe('isEeaCountry', () => {
  it.each(['DE', 'FR', 'NO', 'IS', 'LI', 'HR'])(
    'returns true for EEA country %s',
    (code) => {
      expect(isEeaCountry(code)).toBe(true);
    },
  );

  it.each(['US', 'GB', 'CH', 'BR'])(
    'returns false for non-EEA country %s',
    (code) => {
      expect(isEeaCountry(code)).toBe(false);
    },
  );

  it('is case-sensitive and expects uppercase ISO codes', () => {
    expect(isEeaCountry('de')).toBe(false);
  });

  it.each([undefined, null, ''])('returns false for %p', (value) => {
    expect(isEeaCountry(value)).toBe(false);
  });
});
