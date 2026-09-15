import {
  formatMoneySmsPhoneNumber,
  getMoneySmsLocalDigits,
  maskMoneySmsPhoneNumber,
} from './moneySms';

describe('moneySms', () => {
  it('formats a US phone number as it is entered', () => {
    expect(formatMoneySmsPhoneNumber('4155550123')).toBe('+1 (415) 555-0123');
    expect(getMoneySmsLocalDigits('+1 (415) 555-0123')).toBe('4155550123');
  });

  it('masks all but the final four digits', () => {
    expect(maskMoneySmsPhoneNumber('+14155550123')).toBe('+1 ••• ••• 0123');
  });
});
