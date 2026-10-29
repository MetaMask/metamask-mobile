import {
  formatActivityDate,
  formatActivityTimestamp,
  formatSignedPercent,
  pnlToneClassName,
  formatSettlementProceeds,
  formatSharesAmount,
  formatSignedUsdAmount,
  formatUsdAmount,
  isNonZeroAmount,
} from './portfolioFormatting';

describe('PredictNext portfolio formatting', () => {
  it.each([
    ['0', '$0.00'],
    ['41.25', '$41.25'],
    ['123.125', '$123.13'],
    ['1250.45', '$1,250.45'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatUsdAmount(input)).toBe(expected);
  });

  it.each([
    ['41.5', '+$41.50'],
    ['0', '$0.00'],
    ['-0.001', '$0.00'],
    ['-2.50', '-$2.50'],
    ['-1234.5', '-$1,234.50'],
  ])('formats %s as signed %s', (input, expected) => {
    expect(formatSignedUsdAmount(input)).toBe(expected);
  });

  it.each([
    ['7.85', '+7.85%'],
    ['-24.05', '-24.05%'],
    ['0', '0.00%'],
    ['55.275', '+55.28%'],
  ])('formats percent %s as %s', (input, expected) => {
    expect(formatSignedPercent(input)).toBe(expected);
  });

  it.each([
    ['1.78', 'text-success-default'],
    ['-1.14', 'text-error-default'],
    ['0', 'text-alternative'],
    ['-0.001', 'text-alternative'],
  ])('tones PnL %s as %s', (input, expected) => {
    expect(pnlToneClassName(input)).toBe(expected);
  });

  it('formats a calendar date for the Activity archive horizon', () => {
    const timestamp = '2026-08-27T00:00:00.000Z';
    const expected = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));

    expect(formatActivityDate(timestamp)).toBe(expected);
  });

  it.each([
    ['41.50', '+$41.50'],
    ['0', '$0.00'],
    ['0.00', '$0.00'],
  ])('formats settlement proceeds %s as %s', (input, expected) => {
    expect(formatSettlementProceeds(input)).toBe(expected);
  });

  it.each([
    ['0', false],
    ['0.00', false],
    ['41.25', true],
    ['-2.50', true],
  ])('detects %s as non-zero: %s', (input, expected) => {
    expect(isNonZeroAmount(input)).toBe(expected);
  });

  it.each([
    ['75.00', '75'],
    ['2.50', '2.5'],
    ['10', '10'],
  ])('formats share count %s as %s', (input, expected) => {
    expect(formatSharesAmount(input)).toBe(expected);
  });

  it('formats an Activity timestamp for display', () => {
    const timestamp = '2026-09-01T12:00:00.000Z';
    const expected = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));

    expect(formatActivityTimestamp(timestamp)).toBe(expected);
  });
});
