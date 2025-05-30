import { formatUSPhoneNumber } from './index';

describe('formatUSPhoneNumber', () => {
  it('should return empty string for empty input', () => {
    expect(formatUSPhoneNumber('')).toBe('');
  });

  it('should format phone number correctly', () => {
    expect(formatUSPhoneNumber('1234567890')).toBe('(123) 456-7890');
    expect(formatUSPhoneNumber('123')).toBe('(123');
    expect(formatUSPhoneNumber('123456')).toBe('(123) 456');
  });
});
