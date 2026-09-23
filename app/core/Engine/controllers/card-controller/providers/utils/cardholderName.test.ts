import { buildBaanxCardholderName } from './cardholderName';

describe('buildBaanxCardholderName', () => {
  it('returns the fallback when names are missing', () => {
    expect(buildBaanxCardholderName(null)).toBe('Card Holder');
    expect(buildBaanxCardholderName({ firstName: '', lastName: '' })).toBe(
      'Card Holder',
    );
  });

  it('joins and sanitizes first and last name', () => {
    expect(
      buildBaanxCardholderName({ firstName: 'José', lastName: "O'Brien" }),
    ).toBe('Jose OBrien');
  });
});
