import { formatNumberToTemplate } from './formatNumberToTemplate';

describe('formatNumberToTemplate', () => {
  it('should format a number string to match a template pattern', () => {
    expect(formatNumberToTemplate('3022297388', 'XXX XXX XXXX')).toBe('302 229 7388');
  });

  it('should handle phone number with parentheses and dashes', () => {
    expect(formatNumberToTemplate('1234567890', '(XXX) XXX-XXXX')).toBe('(123) 456-7890');
  });

  it('should handle shorter number than template', () => {
    expect(formatNumberToTemplate('123456', 'XX-XX-XX')).toBe('12-34-56');
  });

  it('should return unformatted number for longer number than template', () => {
    expect(formatNumberToTemplate('1234567890123', 'XXX XXX XXXX')).toBe('1234567890123');
  });

  it('should handle empty input', () => {
    expect(formatNumberToTemplate('', 'XXX XXX XXXX')).toBe('');
  });

  it('should handle input with non-digit characters', () => {
    expect(formatNumberToTemplate('302-229-7388', 'XXX XXX XXXX')).toBe('302 229 7388');
  });

  it('should handle template with no X characters', () => {
    expect(formatNumberToTemplate('123456', '---')).toBe('---');
  });

  it('should handle complex template patterns', () => {
    expect(formatNumberToTemplate('123456789', 'X.X.X.X.X.X.X.X.X')).toBe('1.2.3.4.5.6.7.8.9');
  });

  it('should handle mixed template patterns', () => {
    expect(formatNumberToTemplate('123456', 'X-X X.X')).toBe('1-2 3.4');
  });

  it('should return unformatted number when input exceeds template capacity', () => {
    expect(formatNumberToTemplate('123456789', 'XX-XX')).toBe('123456789');
  });
}); 