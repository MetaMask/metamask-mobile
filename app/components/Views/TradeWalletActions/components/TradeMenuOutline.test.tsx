import { buildTradeMenuOutlinePath } from './TradeMenuOutline';

describe('buildTradeMenuOutlinePath', () => {
  it('includes the bottom cutout curve instead of a straight bottom edge', () => {
    const path = buildTradeMenuOutlinePath({
      width: 320,
      height: 280,
      peakHeight: 16,
      peakBezierLength: 25,
      baseBezierLength: 55,
    });

    expect(path).toContain('C ');
    expect(path).toContain('S ');
    expect(path).not.toMatch(/H 265 V 280 H 55/);
  });
});
