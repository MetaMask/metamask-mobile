import { formatIbanForDisplay } from './formatIban';

describe('formatIbanForDisplay', () => {
  it('groups an IBAN in blocks of four', () => {
    expect(formatIbanForDisplay('DE89370400440532013000')).toBe(
      'DE89 3704 0044 0532 0130 00',
    );
  });

  it('normalizes an IBAN that already contains spaces', () => {
    expect(formatIbanForDisplay('DE89 3704 0044 0532 0130 00')).toBe(
      'DE89 3704 0044 0532 0130 00',
    );
  });

  it('leaves a value shorter than one block unchanged', () => {
    expect(formatIbanForDisplay('DE89')).toBe('DE89');
  });

  it('returns an empty string for an empty IBAN', () => {
    expect(formatIbanForDisplay('')).toBe('');
  });
});
