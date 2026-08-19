import {
  PERPS_SLIPPAGE_DEFAULT_BPS,
  PERPS_TRIGGER_MARKET_DEFAULT_BPS,
  PERPS_SLIPPAGE_MIN_BPS,
  PERPS_SLIPPAGE_MAX_BPS,
  PERPS_SLIPPAGE_STEP_BPS,
  PERPS_SLIPPAGE_QUICK_PICKS_BPS,
  bpsToPercent,
  percentToBps,
  resolvePerpsMaxSlippageBps,
} from './slippageConfig';

describe('slippageConfig constants', () => {
  it('exports expected default values', () => {
    expect(PERPS_SLIPPAGE_DEFAULT_BPS).toBe(300);
    expect(PERPS_TRIGGER_MARKET_DEFAULT_BPS).toBe(1000);
    expect(PERPS_SLIPPAGE_MIN_BPS).toBe(10);
    expect(PERPS_SLIPPAGE_MAX_BPS).toBe(1000);
    expect(PERPS_SLIPPAGE_STEP_BPS).toBe(10);
  });

  it('exports quick-pick presets 0.5%, 2%, 3%', () => {
    expect(PERPS_SLIPPAGE_QUICK_PICKS_BPS).toEqual([50, 200, 300]);
  });

  it('quick-pick presets are within valid range', () => {
    for (const bps of PERPS_SLIPPAGE_QUICK_PICKS_BPS) {
      expect(bps).toBeGreaterThanOrEqual(PERPS_SLIPPAGE_MIN_BPS);
      expect(bps).toBeLessThanOrEqual(PERPS_SLIPPAGE_MAX_BPS);
    }
  });
});

describe('resolvePerpsMaxSlippageBps', () => {
  it('uses the TP/SL default for an unconfigured trigger-market order', () => {
    expect(
      resolvePerpsMaxSlippageBps({
        orderType: 'stop_market',
        maxSlippageBps: PERPS_SLIPPAGE_DEFAULT_BPS,
        maxSlippageSource: 'default',
      }),
    ).toBe(PERPS_TRIGGER_MARKET_DEFAULT_BPS);
  });

  it('preserves an explicit trigger-market setting', () => {
    expect(
      resolvePerpsMaxSlippageBps({
        orderType: 'stop_market',
        maxSlippageBps: 300,
        maxSlippageSource: 'user_configured',
      }),
    ).toBe(300);
  });

  it('does not apply trigger-market defaults to trigger-limit orders', () => {
    expect(
      resolvePerpsMaxSlippageBps({
        orderType: 'stop_limit',
        maxSlippageBps: PERPS_SLIPPAGE_DEFAULT_BPS,
        maxSlippageSource: 'default',
      }),
    ).toBe(PERPS_SLIPPAGE_DEFAULT_BPS);
  });
});

describe('bpsToPercent', () => {
  it('converts 300 bps to 3%', () => {
    expect(bpsToPercent(300)).toBe(3);
  });

  it('converts 10 bps to 0.1%', () => {
    expect(bpsToPercent(10)).toBe(0.1);
  });

  it('converts 1000 bps to 10%', () => {
    expect(bpsToPercent(1000)).toBe(10);
  });

  it('converts 0 bps to 0%', () => {
    expect(bpsToPercent(0)).toBe(0);
  });
});

describe('percentToBps', () => {
  it('converts 3% to 300 bps', () => {
    expect(percentToBps(3)).toBe(300);
  });

  it('converts 0.1% to 10 bps', () => {
    expect(percentToBps(0.1)).toBe(10);
  });

  it('converts 10% to 1000 bps', () => {
    expect(percentToBps(10)).toBe(1000);
  });

  it('rounds to nearest integer', () => {
    expect(percentToBps(3.456)).toBe(346);
  });
});
