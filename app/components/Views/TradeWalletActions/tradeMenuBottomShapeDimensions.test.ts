import { getTradeMenuBottomShapeDimensions } from './tradeMenuBottomShapeDimensions';

describe('getTradeMenuBottomShapeDimensions', () => {
  it('uses button width × 2 with original bezier constants for the default 56px button', () => {
    expect(getTradeMenuBottomShapeDimensions(56)).toEqual({
      width: 112,
      baseBezierLength: 55,
      peakHeight: 16,
      peakBezierLength: 25,
    });
  });

  it('scales only width for other button sizes', () => {
    expect(getTradeMenuBottomShapeDimensions(100)).toEqual({
      width: 200,
      baseBezierLength: 55,
      peakHeight: 16,
      peakBezierLength: 25,
    });
  });
});
