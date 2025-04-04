import bn from 'bignumber.js';
import {
  CommonPercentageInputUnits,
  PercentageOutputFormat,
  fixDisplayAmount,
  formatPercent,
  isEqualOrGreaterOrderOfMagnitude,
} from './index';

describe('fixDisplayAmount', () => {
  it('handles different input formats and returns a string', () => {
    expect(fixDisplayAmount(5)).toBe('5.00');
    expect(fixDisplayAmount('5')).toBe('5.00');
    expect(fixDisplayAmount(new bn(5))).toBe('5.00');
  });
  it('rounds number to 4 decimals when decimals is set to 4', () => {
    expect(fixDisplayAmount(5.45446, 4)).toBe('5.4544');
    expect(fixDisplayAmount('5.45446', 4)).toBe('5.4544');
    expect(fixDisplayAmount(new bn(5.45446), 4)).toBe('5.4544');
  });
  it('fixes decimals regardless of trailing zeroes', () => {
    expect(fixDisplayAmount('5.40000', 2)).toBe('5.40');
    expect(fixDisplayAmount(new bn('5.40000'), 2)).toBe('5.40');
  });
  it('fixes exponential decimals in scientific notation when input is over default evaluated exponent', () => {
    expect(fixDisplayAmount(1000000000000000000000, 2)).toBe('1.00e+21');
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(fixDisplayAmount(1234567891234567891234, 2)).toBe('1.23e+21');
    expect(fixDisplayAmount('1234567891234567891234', 2)).toBe('1.23e+21');
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    expect(fixDisplayAmount(new bn(1234567891234567891234), 2)).toBe(
      '1.23e+21',
    );
  });
  it('fixes exponential decimals in scientific notation when input is over custom evaluated exponent', () => {
    expect(fixDisplayAmount(100000, 2, 5)).toBe('1.00e+5');
    expect(fixDisplayAmount(123456, 2, 5)).toBe('1.23e+5');
    expect(fixDisplayAmount('123456', 2, 5)).toBe('1.23e+5');
    expect(fixDisplayAmount(new bn(123456), 2, 5)).toBe('1.23e+5');
  });
  it('fixes decimals in scientific notation when decimal input is below 1 but over default inverse evaluated exponent', () => {
    expect(fixDisplayAmount(0.123, 2)).toBe('0.12');
    expect(fixDisplayAmount('0.123', 2)).toBe('0.12');
    expect(fixDisplayAmount(new bn(0.123), 2)).toBe('0.12');
  });
  it('fixes exponential decimals in scientific notation when decimal input is under custom inverse evaluated exponent', () => {
    expect(fixDisplayAmount(0.001, 2, 3)).toBe('1.00e-3');
    expect(fixDisplayAmount(0.0001234, 2, 3)).toBe('1.23e-4');
    expect(fixDisplayAmount('0.0001234', 2, 3)).toBe('1.23e-4');
    expect(fixDisplayAmount(new bn(0.0001234), 2, 3)).toBe('1.23e-4');
  });
  it('defaults to rounding down', () => {
    expect(fixDisplayAmount('210.626398728671935147', 4, undefined)).toBe(
      '210.6263',
    );
  });
  it('obeys a passed rounding instruction', () => {
    expect(
      fixDisplayAmount(
        '210.626398728671935147',
        4,
        undefined,
        bn.ROUND_HALF_UP,
      ),
    ).toBe('210.6264');
  });
});

describe('isEqualOrGreaterOrderOfMagnitude', () => {
  it('returns true when value is larger than evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(1000), 2)).toBe(true);
  });
  it('returns true when value is same order of magnitude to evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(100), 2)).toBe(true);
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(0.01), 2)).toBe(true);
  });
  it('returns true when value is smaller than inverse evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(0.001), 2)).toBe(true);
  });
  it('returns false when value is 1 or larger but smaller than evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(1), 2)).toBe(false);
  });
  it('returns false when value is smaller than 1 but larger than inverse evaluated exponent', () => {
    expect(isEqualOrGreaterOrderOfMagnitude(new bn(0.1), 2)).toBe(false);
  });
});

describe('formatPercent', () => {
  it('converts basis points provided as a number to a formatted basis point string', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0 bps');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('1 bp');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-1 bp');

    expect(
      formatPercent(2, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('2 bps');

    expect(
      formatPercent(200, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('200 bps');

    expect(
      formatPercent(-200, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-200 bps');

    expect(
      formatPercent(0.92739292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0.92739292 bps');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-475478383.388298292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-475478383.3882983 bps');
  });

  it('converts basis points provided as a string to a formatted basis point string', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0 bps');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent('1', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('1 bp');

    expect(
      formatPercent('-1', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-1 bp');

    expect(
      formatPercent('2', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('2 bps');

    expect(
      formatPercent('200', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('200 bps');

    expect(
      formatPercent('-200', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-200 bps');

    expect(
      formatPercent('0.92739292', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0.92739292 bps');

    expect(
      formatPercent('-475478383.388298292', {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-475478383.388298292 bps');
  });

  it('converts basis points provided as a number to a formatted basis point string with a fixed number of decimals', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('0.00 bps');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('1.00 bp');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('-1.00 bp');

    expect(
      formatPercent(2, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('2.00 bps');

    expect(
      formatPercent(200, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('200.00 bps');

    expect(
      formatPercent(-200, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('-200.00 bps');

    expect(
      formatPercent(0.92739292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('0.93 bps');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-475478383.388298292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 2,
      }),
    ).toEqual('-475478383.39 bps');
  });

  it('converts basis points provided as a string to a formatted basis point string with a fixed number of decimals', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('0 bps');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('1 bp');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('-1 bp');

    expect(
      formatPercent(2, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('2 bps');

    expect(
      formatPercent(200, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('200 bps');

    expect(
      formatPercent(-200, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('-200 bps');

    expect(
      formatPercent(0.92739292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('1 bp');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-475478383.388298292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 0,
      }),
    ).toEqual('-475478383 bps');
  });

  it('converts decimals provided as a number to a formatted basis point string', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0 bps');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent(0.0001, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('1 bp');

    expect(
      formatPercent(-0.0001, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-1 bp');

    expect(
      formatPercent(0.0002, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('2 bps');

    expect(
      formatPercent(0.01, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('100 bps');

    expect(
      formatPercent(-0.01, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-100 bps');

    expect(
      formatPercent(0.00092739292, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('9.2739292 bps');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-4754783833882.98292, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-47547838338829830 bps');
  });

  it('converts decimals provided as a string to a formatted basis point string', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0 bps');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent('0.0001', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('1 bp');

    expect(
      formatPercent('-0.0001', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-1 bp');

    expect(
      formatPercent('0.0002', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('2 bps');

    expect(
      formatPercent('0.01', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('100 bps');

    expect(
      formatPercent('-0.01', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-100 bps');

    expect(
      formatPercent('0.00092739292', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('9.2739292 bps');

    expect(
      formatPercent('-4754783833882.98292', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-47547838338829829.2 bps');
  });

  it('converts decimals provided as a number to a formatted basis point string with a fixed number of decimals', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('0.0 bps');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent(0.0001, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('1.0 bp');

    expect(
      formatPercent(-0.0001, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-1.0 bp');

    expect(
      formatPercent(0.0002, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('2.0 bps');

    expect(
      formatPercent(0.01, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('100.0 bps');

    expect(
      formatPercent(-0.01, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-100.0 bps');

    expect(
      formatPercent(0.00092739292, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('9.3 bps');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-4754783833882.98292, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-47547838338829830.0 bps');
  });

  it('converts decimals provided as a string to a formatted basis point string with a fixed number of decimals', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('0.0 bps');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent('0.0001', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('1.0 bp');

    expect(
      formatPercent('-0.0001', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-1.0 bp');

    expect(
      formatPercent('0.0002', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('2.0 bps');

    expect(
      formatPercent('0.01', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('100.0 bps');

    expect(
      formatPercent('-0.01', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-100.0 bps');

    expect(
      formatPercent('0.00092739292', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('9.3 bps');

    expect(
      formatPercent('-4754783833882.98292', {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 1,
      }),
    ).toEqual('-47547838338829829.2 bps');
  });

  it('converts a percentage provided as a number to a formatted basis point string', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0 bps');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent(0.01, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('1 bp');

    expect(
      formatPercent(-0.01, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-1 bp');

    expect(
      formatPercent(0.02, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('2 bps');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('100 bps');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-100 bps');

    expect(
      formatPercent(0.092739292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('9.2739292 bps');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-475478383388298.292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-47547838338829830 bps');
  });

  it('converts a percentage provided as a string to a formatted basis point string', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('0 bps');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent('0.01', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('1 bp');

    expect(
      formatPercent('-0.01', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-1 bp');

    expect(
      formatPercent('0.02', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('2 bps');

    expect(
      formatPercent('1', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('100 bps');

    expect(
      formatPercent('-1', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-100 bps');

    expect(
      formatPercent('0.092739292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('9.2739292 bps');

    expect(
      formatPercent('-475478383388298.292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
      }),
    ).toEqual('-47547838338829829.2 bps');
  });

  it('converts a percentage provided as a number to a formatted basis point string with a fixed number of decimals', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('0.0000 bps');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent(0.01, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('1.0000 bp');

    expect(
      formatPercent(-0.01, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-1.0000 bp');

    expect(
      formatPercent(0.02, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('2.0000 bps');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('100.0000 bps');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-100.0000 bps');

    expect(
      formatPercent(0.092739292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('9.2739 bps');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-475478383388298.292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-47547838338829830.0000 bps');
  });

  it('converts a percentage provided as a string to a formatted basis point string with a fixed number of decimals', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('0.0000 bps');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('Infinity bps');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-Infinity bps');

    expect(
      formatPercent('0.01', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('1.0000 bp');

    expect(
      formatPercent('-0.01', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-1.0000 bp');

    expect(
      formatPercent('0.02', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('2.0000 bps');

    expect(
      formatPercent('1', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('100.0000 bps');

    expect(
      formatPercent('-1', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-100.0000 bps');

    expect(
      formatPercent('0.092739292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('9.2739 bps');

    expect(
      formatPercent('-475478383388298.292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.BASIS_POINTS,
        fixed: 4,
      }),
    ).toEqual('-47547838338829829.2000 bps');
  });

  it('converts basis points provided as a number to a formatted decimal', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('Infinity');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-Infinity');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0.0001');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-0.0001');

    expect(
      formatPercent(10, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0.001');

    expect(
      formatPercent(100, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0.01');

    expect(
      formatPercent(-1000, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-0.1');

    expect(
      formatPercent(2000, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0.2');

    expect(
      formatPercent(20000, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('2');

    expect(
      formatPercent(-200000, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-20');

    expect(
      formatPercent(0.00092739292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('9.2739292e-8');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-4754783833882.98292, {
        inputFormat: CommonPercentageInputUnits.BASIS_POINTS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-475478383.3882983');
  });

  it('converts decimals provided as a decimal to a formatted decimal', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('Infinity');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-Infinity');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('1');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-1');

    expect(
      formatPercent(2, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('2');

    expect(
      formatPercent(100, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('100');

    expect(
      formatPercent(-100, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-100');

    expect(
      formatPercent(0.000000092739292, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('9.2739292e-8');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-47547.8383388298292, {
        inputFormat: CommonPercentageInputUnits.DECIMALS,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-47547.83833882983');
  });

  it('converts a percentage provided as a number to a formatted decimal', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('Infinity');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-Infinity');

    expect(
      formatPercent(100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('1');

    expect(
      formatPercent(-100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-1');

    expect(
      formatPercent(200, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('2');

    expect(
      formatPercent(10000, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('100');

    expect(
      formatPercent(-10000, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-100');

    expect(
      formatPercent(0.0000092739292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('9.2739292e-8');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-4754783.83388298292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-47547.83833882983');
  });

  it('converts a percentage provided as a string to a formatted decimal', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('Infinity');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-Infinity');

    expect(
      formatPercent('100', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('1');

    expect(
      formatPercent('-100', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-1');

    expect(
      formatPercent('200', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('2');

    expect(
      formatPercent('10000', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('100');

    expect(
      formatPercent('-10000', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-100');

    expect(
      formatPercent('0.0000092739292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('9.2739292e-8');

    expect(
      formatPercent('-4754783.83388298292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-47547.8383388298292');
  });

  it('converts a percentage provided as a number to a formatted decimal with a fixed number of decimals', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('0');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('Infinity');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-Infinity');

    expect(
      formatPercent(100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('1');

    expect(
      formatPercent(-100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-1');

    expect(
      formatPercent(200, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('2');

    expect(
      formatPercent(10000, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('100');

    expect(
      formatPercent(-10000, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-100');

    expect(
      formatPercent(0.0000092739292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('0');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-4754783.83388298292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-47548');
  });

  it('converts a percentage provided as a string to a formatted decimal with a fixed number of decimals', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('0');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('Infinity');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-Infinity');

    expect(
      formatPercent('100', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('1');

    expect(
      formatPercent('-100', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-1');

    expect(
      formatPercent('200', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('2');

    expect(
      formatPercent('10000', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('100');

    expect(
      formatPercent('-10000', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-100');

    expect(
      formatPercent('0.0000092739292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('0');

    expect(
      formatPercent('-4754783.83388298292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: 0,
      }),
    ).toEqual('-47548');
  });

  it('converts a percentage provided as a number to a formatted percentage', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('0%');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('Infinity%');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-Infinity%');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('1%');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-1%');

    expect(
      formatPercent(2, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('2%');

    expect(
      formatPercent(100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('100%');

    expect(
      formatPercent(-100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-100%');

    expect(
      formatPercent(0.000000092739292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('9.2739292e-8%');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-4754783.83388298292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-4754783.833882983%');
  });

  it('converts a percentage provided as a string to a formatted percentage', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('0%');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('Infinity%');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-Infinity%');

    expect(
      formatPercent('1', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('1%');

    expect(
      formatPercent('-1', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-1%');

    expect(
      formatPercent('2', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('2%');

    expect(
      formatPercent('100.0000', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('100%');

    expect(
      formatPercent('-100', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-100%');

    expect(
      formatPercent('0.000000092739292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('9.2739292e-8%');

    expect(
      formatPercent('-4754783.83388298292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
      }),
    ).toEqual('-4754783.83388298292%');
  });

  it('converts a percentage provided as a number to a formatted percentage with a fixed number of decimals', () => {
    expect(
      formatPercent(0, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('0.0%');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('Infinity%');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-Infinity%');

    expect(
      formatPercent(1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('1.0%');

    expect(
      formatPercent(-1, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-1.0%');

    expect(
      formatPercent(2, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('2.0%');

    expect(
      formatPercent(100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('100.0%');

    expect(
      formatPercent(-100, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-100.0%');

    expect(
      formatPercent(0.000000092739292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('0.0%');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-4754783.83388298292, {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-4754783.8%');
  });

  it('converts a percentage provided as a string to a formatted percentage with a fixed number of decimals', () => {
    expect(
      formatPercent('0', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('0.0%');

    expect(
      formatPercent('Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('Infinity%');

    expect(
      formatPercent('-Infinity', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-Infinity%');

    expect(
      formatPercent('1.000', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('1.0%');

    expect(
      formatPercent('-1', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-1.0%');

    expect(
      formatPercent('2', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('2.0%');

    expect(
      formatPercent('100', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('100.0%');

    expect(
      formatPercent('-100', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-100.0%');

    expect(
      formatPercent('0.000000092739292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('0.0%');

    expect(
      formatPercent('-4754783.83388298292', {
        inputFormat: CommonPercentageInputUnits.PERCENTAGE,
        outputFormat: PercentageOutputFormat.PERCENT_SIGN,
        fixed: 1,
      }),
    ).toEqual('-4754783.8%');
  });

  it('converts inputs with arbitrary formats to decimal format', () => {
    expect(
      formatPercent(0, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('0');

    expect(
      formatPercent(Number.POSITIVE_INFINITY, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('Infinity');

    expect(
      formatPercent(Number.NEGATIVE_INFINITY, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-Infinity');

    expect(
      formatPercent(10, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('1');

    expect(
      formatPercent(-10, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-1');

    expect(
      formatPercent(20, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('2');

    expect(
      formatPercent(1000, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('100');

    expect(
      formatPercent(-1000, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-100');

    expect(
      formatPercent(0.00000092739292, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('9.2739292e-8');

    expect(
      // disabling no-loss-of-precision because excessively precise inputs are possible
      // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
      formatPercent(-475478.383388298292, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
      }),
    ).toEqual('-47547.83833882983');
  });

  it('throws if provided a negative number as the decimal toFixed', () => {
    expect(() =>
      formatPercent(1000, {
        inputFormat: -1,
        outputFormat: PercentageOutputFormat.DECIMAL,
        fixed: -2,
      }),
    ).toThrow(
      'Cannot convert a number to negative number of fixed places. Tried: -2',
    );
  });
});
