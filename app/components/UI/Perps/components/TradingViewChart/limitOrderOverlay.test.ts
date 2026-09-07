import {
  clearLimitOrderLines,
  createLimitOrderOverlayScript,
  getLimitOrdersSignature,
  shouldRedrawLimitOrderLines,
  updateLimitOrderLines,
  type LimitOverlayHost,
} from './limitOrderOverlay';

const OVERLAY_COLORS = {
  sell: 'error.default',
  buy: 'success.default',
};

function createOverlayHost(): LimitOverlayHost & {
  applyOptions: jest.Mock;
} {
  const applyOptions = jest.fn();
  return {
    applyOptions,
    lastLimitOrderPrices: [],
    lastLimitOrderSignature: '',
    priceLines: { limitOrders: [] },
    candlestickSeries: {
      removePriceLine: jest.fn(),
      createPriceLine: jest.fn((opts) => ({ ...opts })),
      priceScale: jest.fn(() => ({ applyOptions })),
    } as LimitOverlayHost['candlestickSeries'] & {
      priceScale: jest.Mock;
    },
  };
}

describe('limitOrderOverlay', () => {
  it('skips redraw when the limit set is unchanged', () => {
    expect(
      shouldRedrawLimitOrderLines('1:50000:buy', [
        { id: '1', price: '50000', side: 'buy' },
      ]),
    ).toBe(false);
    expect(
      shouldRedrawLimitOrderLines('1:50000:buy', [
        { id: '1', price: '50100', side: 'buy' },
      ]),
    ).toBe(true);
    expect(getLimitOrdersSignature([])).toBe('');
  });

  it('does not recreate lines or force autoscale on a current-price tick', () => {
    const host = createOverlayHost();
    const limits = [{ id: 'ord-1', price: '50000', side: 'buy' }];

    updateLimitOrderLines(host, limits, OVERLAY_COLORS);
    updateLimitOrderLines(host, limits, OVERLAY_COLORS);

    expect(host.candlestickSeries?.createPriceLine).toHaveBeenCalledTimes(1);
    expect(host.candlestickSeries?.removePriceLine).not.toHaveBeenCalled();
    expect(host.applyOptions).not.toHaveBeenCalled();
    expect(host.priceLines.limitOrders).toHaveLength(1);
  });

  it('clears lines and autoscale cache when limits are cancelled', () => {
    const host = createOverlayHost();
    updateLimitOrderLines(
      host,
      [{ id: 'ord-1', price: '50000', side: 'buy' }],
      OVERLAY_COLORS,
    );

    updateLimitOrderLines(host, [], OVERLAY_COLORS);

    expect(host.candlestickSeries?.removePriceLine).toHaveBeenCalledTimes(1);
    expect(host.priceLines.limitOrders).toEqual([]);
    expect(host.lastLimitOrderPrices).toEqual([]);
    expect(host.lastLimitOrderSignature).toBe('');
    expect(host.applyOptions).not.toHaveBeenCalled();
  });

  it('embeds skip-if-unchanged helpers and never forces autoscale', () => {
    const script = createLimitOrderOverlayScript(OVERLAY_COLORS);
    expect(script).toContain(
      'if (nextSignature === window.lastLimitOrderSignature)',
    );
    expect(script).not.toContain('applyOptions');
    expect(script).toContain(OVERLAY_COLORS.sell);
    clearLimitOrderLines(createOverlayHost());
  });
});
