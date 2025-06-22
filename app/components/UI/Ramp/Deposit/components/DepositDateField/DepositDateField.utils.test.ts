import { getDateDisplayValue, formatDate } from './DepositDateField';

describe('getDateDisplayValue', () => {
  it('should return parsed date for valid MM/DD/YYYY format', () => {
    const result = getDateDisplayValue('12/25/1990');
    expect(result.getFullYear()).toBe(1990);
    expect(result.getMonth()).toBe(11); // December is month 11 (0-indexed)
    expect(result.getDate()).toBe(25);
  });

  it('should return parsed date for valid MM/DD/YYYY format with leading zeros', () => {
    const result = getDateDisplayValue('03/05/1985');
    expect(result.getFullYear()).toBe(1985);
    expect(result.getMonth()).toBe(2); // March is month 2 (0-indexed)
    expect(result.getDate()).toBe(5);
  });

  it('should return default date (January 1, 2000) for empty value', () => {
    const result = getDateDisplayValue('');
    expect(result.getFullYear()).toBe(2000);
    expect(result.getMonth()).toBe(0); // January is month 0 (0-indexed)
    expect(result.getDate()).toBe(1);
  });

  it('should return default date for invalid date format', () => {
    const result = getDateDisplayValue('invalid-date');
    expect(result.getFullYear()).toBe(2000);
    expect(result.getMonth()).toBe(0); // January is month 0 (0-indexed)
    expect(result.getDate()).toBe(1);
  });

  it('should return default date for incomplete date string', () => {
    const result = getDateDisplayValue('12/25');
    expect(result.getFullYear()).toBe(2000);
    expect(result.getMonth()).toBe(0); // January is month 0 (0-indexed)
    expect(result.getDate()).toBe(1);
  });

  it('should return default date for invalid date values', () => {
    const result = getDateDisplayValue('13/32/1990'); // Invalid month and day
    expect(result.getFullYear()).toBe(2000);
    expect(result.getMonth()).toBe(0); // January is month 0 (0-indexed)
    expect(result.getDate()).toBe(1);
  });

  it('should return default date for non-numeric values', () => {
    const result = getDateDisplayValue('ab/cd/efgh');
    expect(result.getFullYear()).toBe(2000);
    expect(result.getMonth()).toBe(0); // January is month 0 (0-indexed)
    expect(result.getDate()).toBe(1);
  });

  it('should handle edge case of February 29th in leap year', () => {
    const result = getDateDisplayValue('02/29/2020'); // Valid leap year date
    expect(result.getFullYear()).toBe(2020);
    expect(result.getMonth()).toBe(1); // February is month 1 (0-indexed)
    expect(result.getDate()).toBe(29);
  });

  it('should return default date for February 29th in non-leap year', () => {
    const result = getDateDisplayValue('02/29/2021'); // Invalid date (not a leap year)
    expect(result.getFullYear()).toBe(2000);
    expect(result.getMonth()).toBe(0); // January is month 0 (0-indexed)
    expect(result.getDate()).toBe(1);
  });
});

describe('formatDate', () => {
  it('should format date with single digit month and day', () => {
    const date = new Date(1990, 0, 5); // January 5, 1990
    const result = formatDate(date);
    expect(result).toBe('01/05/1990');
  });

  it('should format date with double digit month and day', () => {
    const date = new Date(1990, 11, 25); // December 25, 1990
    const result = formatDate(date);
    expect(result).toBe('12/25/1990');
  });

  it('should format date with leading zeros for single digits', () => {
    const date = new Date(1985, 2, 3); // March 3, 1985
    const result = formatDate(date);
    expect(result).toBe('03/03/1985');
  });

  it('should format leap year date correctly', () => {
    const date = new Date(2020, 1, 29); // February 29, 2020 (leap year)
    const result = formatDate(date);
    expect(result).toBe('02/29/2020');
  });

  it('should format date with different years', () => {
    const date = new Date(2000, 5, 15); // June 15, 2000
    const result = formatDate(date);
    expect(result).toBe('06/15/2000');
  });

  it('should format date with century change', () => {
    const date = new Date(1900, 0, 1); // January 1, 1900
    const result = formatDate(date);
    expect(result).toBe('01/01/1900');
  });

  it('should format current year date correctly', () => {
    const currentYear = new Date().getFullYear();
    const date = new Date(currentYear, 11, 31); // December 31, current year
    const result = formatDate(date);
    expect(result).toBe(`12/31/${currentYear}`);
  });

  it('should handle edge case of month 0 (January)', () => {
    const date = new Date(1990, 0, 1); // January 1, 1990
    const result = formatDate(date);
    expect(result).toBe('01/01/1990');
  });

  it('should handle edge case of month 11 (December)', () => {
    const date = new Date(1990, 11, 31); // December 31, 1990
    const result = formatDate(date);
    expect(result).toBe('12/31/1990');
  });
}); 