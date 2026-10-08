import { calculatePositionSize } from '@metamask/perps-controller';

import {
  convertAssetAmountToUsd,
  limitAssetAmountDecimals,
  toKeypadAssetAmount,
} from './assetAmountInput';

describe('convertAssetAmountToUsd', () => {
  it('returns 0 when the asset amount or price cannot be priced', () => {
    expect(convertAssetAmountToUsd('', 10)).toBe('0');
    expect(convertAssetAmountToUsd('.', 10)).toBe('0');
    expect(convertAssetAmountToUsd('1.', 0)).toBe('0');
    expect(convertAssetAmountToUsd('1', Number.NaN)).toBe('0');
    expect(convertAssetAmountToUsd('abc', 10)).toBe('0');
  });

  it.each([
    ['PEOPLE', 1 / 121],
    ['BOME', 1 / 939],
  ])(
    'keeps 1 %s coin equal to 1 coin after converting through USD',
    (_symbol, price) => {
      const usd = convertAssetAmountToUsd('1', price);

      expect(usd).not.toBe('1');
      expect(
        calculatePositionSize({
          amount: usd,
          price,
          szDecimals: 0,
        }),
      ).toBe('1');
    },
  );
});

describe('toKeypadAssetAmount', () => {
  it('strips display formatting from a keypad seed', () => {
    expect(toKeypadAssetAmount('1.5000')).toBe('1.5');
    expect(toKeypadAssetAmount('1,210')).toBe('1210');
    expect(toKeypadAssetAmount('0.000')).toBe('0');
    expect(toKeypadAssetAmount('—')).toBe('0');
    expect(toKeypadAssetAmount(undefined)).toBe('0');
  });
});

describe('limitAssetAmountDecimals', () => {
  it('limits fractional digits and keeps a trailing decimal point', () => {
    expect(limitAssetAmountDecimals('1.23456', 4)).toBe('1.2345');
    expect(limitAssetAmountDecimals('1.', 4)).toBe('1.');
    expect(limitAssetAmountDecimals('1.2', 0)).toBe('1');
  });
});
