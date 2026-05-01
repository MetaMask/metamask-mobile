import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  isRampsOrderTypeBuy,
  isRampsOrderTypeSell,
  normalizeRampsOrderTypeForFiatOrder,
} from './normalizeRampsOrderTypeForFiatOrder';

describe('normalizeRampsOrderTypeForFiatOrder', () => {
  it.each([
    ['BUY', OrderOrderTypeEnum.Buy],
    ['buy', OrderOrderTypeEnum.Buy],
    ['Buy', OrderOrderTypeEnum.Buy],
    ['', OrderOrderTypeEnum.Buy],
    ['SELL', OrderOrderTypeEnum.Sell],
    ['sell', OrderOrderTypeEnum.Sell],
    ['TRANSFER', OrderOrderTypeEnum.Transfer],
  ])('maps %p to %p', (input, expected) => {
    expect(normalizeRampsOrderTypeForFiatOrder(input)).toBe(expected);
  });

  it('preserves unknown order type strings', () => {
    expect(normalizeRampsOrderTypeForFiatOrder('CUSTOM')).toBe('CUSTOM');
  });
});

describe('isRampsOrderTypeSell', () => {
  it.each([
    ['SELL', true],
    ['sell', true],
    ['  SELL  ', true],
    ['BUY', false],
    ['buy', false],
    ['', false],
    [undefined, false],
  ])('for %p returns %p', (input, expected) => {
    expect(isRampsOrderTypeSell(input)).toBe(expected);
  });
});

describe('isRampsOrderTypeBuy', () => {
  it.each([
    ['BUY', true],
    ['buy', true],
    ['', true],
    [undefined, true],
    ['SELL', false],
    ['TRANSFER', false],
    ['DEPOSIT', false],
    ['CUSTOM', false],
  ])('for %p returns %p', (input, expected) => {
    expect(isRampsOrderTypeBuy(input)).toBe(expected);
  });
});
