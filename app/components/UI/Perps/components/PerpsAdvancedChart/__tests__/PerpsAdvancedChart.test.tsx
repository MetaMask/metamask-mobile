import { mapTpslToPositionLines } from '../PerpsAdvancedChart';
import type { TPSLLines } from '../../TradingViewChart/TradingViewChart';

describe('mapTpslToPositionLines', () => {
  it('returns undefined when tpslLines is undefined', () => {
    expect(mapTpslToPositionLines(undefined, undefined)).toBeUndefined();
  });

  it('returns undefined when entryPrice is absent', () => {
    const partial: TPSLLines = { takeProfitPrice: '45000' };
    expect(mapTpslToPositionLines(partial, '1.0')).toBeUndefined();
  });

  it('returns undefined when entryPrice is non-finite', () => {
    expect(
      mapTpslToPositionLines({ entryPrice: 'NaN' }, '1.0'),
    ).toBeUndefined();
  });

  it('maps string TPSL to numeric PositionLines with long side for positive size', () => {
    const result = mapTpslToPositionLines(
      {
        entryPrice: '42000',
        takeProfitPrice: '45000',
        stopLossPrice: '40000',
        liquidationPrice: '38000',
      },
      '0.5',
    );
    expect(result).toEqual({
      side: 'long',
      entryPrice: 42000,
      takeProfitPrice: 45000,
      stopLossPrice: 40000,
      liquidationPrice: 38000,
    });
  });

  it('maps short side for negative position size', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, '-0.5');
    expect(result?.side).toBe('short');
  });

  it('defaults to long when positionSize is undefined', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, undefined);
    expect(result?.side).toBe('long');
  });

  it('omits optional lines when they are absent', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, '1.0');
    expect(result).toEqual({ side: 'long', entryPrice: 42000 });
    expect(result?.takeProfitPrice).toBeUndefined();
    expect(result?.stopLossPrice).toBeUndefined();
    expect(result?.liquidationPrice).toBeUndefined();
  });

  it('omits optional lines when they are non-finite', () => {
    const result = mapTpslToPositionLines(
      { entryPrice: '42000', takeProfitPrice: 'invalid', stopLossPrice: '' },
      '1.0',
    );
    expect(result?.takeProfitPrice).toBeUndefined();
    expect(result?.stopLossPrice).toBeUndefined();
  });

  it('uses 0 size as long', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, '0');
    expect(result?.side).toBe('long');
  });
});
