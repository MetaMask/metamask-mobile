import type { Position } from '@metamask/perps-controller';
import { validateReduceOnlyOrder } from './reduceOnlyValidation';

const createPosition = (overrides: Partial<Position> = {}): Position =>
  ({
    symbol: 'BTC',
    size: '1',
    entryPrice: '50000',
    positionValue: '50000',
    unrealizedPnl: '0',
    marginUsed: '5000',
    leverage: { type: 'isolated', value: 10 },
    liquidationPrice: '45000',
    maxLeverage: 50,
    returnOnEquity: '0',
    cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
    takeProfitCount: 0,
    stopLossCount: 0,
    ...overrides,
  }) as Position;

describe('validateReduceOnlyOrder', () => {
  it('returns valid when reduceOnly is false', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: false,
      direction: 'long',
      orderSize: '10',
      position: null,
    });

    expect(result).toEqual({
      isValid: true,
      isFullClose: false,
    });
  });

  it('returns no_position when there is no open position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.1',
      position: null,
    });

    expect(result.errorCode).toBe('no_position');
    expect(result.isValid).toBe(false);
    expect(result.isFullClose).toBe(false);
  });

  it('returns no_position when position size is zero', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.1',
      position: createPosition({ size: '0' }),
    });

    expect(result.errorCode).toBe('no_position');
    expect(result.isValid).toBe(false);
  });

  it('returns wrong_side when the order matches a long position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'long',
      orderSize: '0.1',
      position: createPosition({ size: '1' }),
    });

    expect(result.errorCode).toBe('wrong_side');
    expect(result.isValid).toBe(false);
  });

  it('returns wrong_side when the order matches a short position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.1',
      position: createPosition({ size: '-1' }),
    });

    expect(result.errorCode).toBe('wrong_side');
    expect(result.isValid).toBe(false);
  });

  it('returns too_large when order size exceeds the open position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '1.1',
      position: createPosition({ size: '1' }),
    });

    expect(result.errorCode).toBe('too_large');
    expect(result.isValid).toBe(false);
  });

  it('accepts an order smaller than the open position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '0.9',
      position: createPosition({ size: '1' }),
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(false);
  });

  it('marks an order equal to the open position as a full close', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '1',
      position: createPosition({ size: '1' }),
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(true);
  });

  it('accepts a partial reduce-only order against a short position', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'long',
      orderSize: '0.25',
      position: createPosition({ size: '-1' }),
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(false);
  });

  it('treats an empty order size as valid for the closing side', () => {
    const result = validateReduceOnlyOrder({
      reduceOnly: true,
      direction: 'short',
      orderSize: '',
      position: createPosition({ size: '1' }),
    });

    expect(result.isValid).toBe(true);
    expect(result.isFullClose).toBe(false);
  });
});
