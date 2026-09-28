import { formatAmountWithSpaces } from './amount.utils';

describe('formatAmountWithSpaces', () => {
  it('groups the integer part in thousands', () => {
    expect(formatAmountWithSpaces('1234567.89')).toBe('1 234 567.89');
  });

  it('preserves a trailing decimal point', () => {
    expect(formatAmountWithSpaces('1234.')).toBe('1 234.');
  });

  it('preserves integers beyond safe number precision', () => {
    expect(formatAmountWithSpaces('9007199254740993.000001')).toBe(
      '9 007 199 254 740 993.000001',
    );
  });
});
