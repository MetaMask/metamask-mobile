import { calculateInputFontSize } from './calculateInputFontSize';

describe('calculateInputFontSize', () => {
  it('returns 40 for lengths up to 10', () => {
    expect(calculateInputFontSize(5)).toBe(40);
    expect(calculateInputFontSize(10)).toBe(40);
  });

  it('returns 35 for lengths between 11 and 15', () => {
    expect(calculateInputFontSize(11)).toBe(35);
    expect(calculateInputFontSize(15)).toBe(35);
  });

  it('returns 30 for lengths between 16 and 20', () => {
    expect(calculateInputFontSize(16)).toBe(30);
    expect(calculateInputFontSize(20)).toBe(30);
  });

  it('returns 25 for lengths between 21 and 25', () => {
    expect(calculateInputFontSize(21)).toBe(25);
    expect(calculateInputFontSize(25)).toBe(25);
  });

  it('returns 20 for lengths greater than 25', () => {
    expect(calculateInputFontSize(26)).toBe(20);
    expect(calculateInputFontSize(100)).toBe(20);
  });
});
