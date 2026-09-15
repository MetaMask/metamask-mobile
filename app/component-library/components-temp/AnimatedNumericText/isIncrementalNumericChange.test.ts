import {
  isIncrementalNumericChange,
  isZeroPlaceholder,
} from './isIncrementalNumericChange';

describe('isIncrementalNumericChange', () => {
  it('treats appending a digit as incremental, including when a comma is inserted', () => {
    expect(isIncrementalNumericChange('123', '1,234')).toBe(true);
  });

  it('treats deleting the last digit as incremental', () => {
    expect(isIncrementalNumericChange('1,234', '123')).toBe(true);
  });

  it('treats an unchanged numeric run as incremental', () => {
    expect(isIncrementalNumericChange('1,234', '1,234')).toBe(true);
  });

  it('treats replacing the whole amount as a bulk change', () => {
    expect(isIncrementalNumericChange('0.00', '1,234.56')).toBe(false);
  });

  it('treats a percentage jump from a typed amount as a bulk change', () => {
    expect(isIncrementalNumericChange('12', '1,234.56')).toBe(false);
  });

  it('treats typing the first digit over a zero placeholder as incremental', () => {
    expect(isIncrementalNumericChange('0', '1')).toBe(true);
    expect(isIncrementalNumericChange('0.00', '1')).toBe(true);
  });

  it('treats a percentage jump from a zero placeholder as a bulk change', () => {
    expect(isIncrementalNumericChange('0.00', '1,234.56')).toBe(false);
  });

  it('treats deleting the last digit back to a zero placeholder as incremental', () => {
    expect(isIncrementalNumericChange('1', '0')).toBe(true);
    expect(isIncrementalNumericChange('1', '0.00')).toBe(true);
  });
});

describe('isZeroPlaceholder', () => {
  it('recognizes empty-field placeholders', () => {
    expect(isZeroPlaceholder('0')).toBe(true);
    expect(isZeroPlaceholder('0.00')).toBe(true);
  });

  it('rejects a typed amount', () => {
    expect(isZeroPlaceholder('1')).toBe(false);
    expect(isZeroPlaceholder('0.5')).toBe(false);
  });
});
