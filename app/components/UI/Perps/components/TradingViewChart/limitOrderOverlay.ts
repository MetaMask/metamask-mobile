export interface LimitOrderOverlayInput {
  id?: string;
  price?: string | number;
  side?: string;
}

export interface LimitOverlayHost {
  lastLimitOrderPrices: (string | number)[];
  lastLimitOrderSignature: string;
  priceLines: {
    limitOrders: { line: unknown; price: number; side?: string }[];
  };
  candlestickSeries: {
    removePriceLine: (line: unknown) => void;
    createPriceLine: (options: {
      price: number;
      color: string;
      lineWidth: number;
      lineStyle: number;
      axisLabelVisible: boolean;
      title: string;
    }) => unknown;
  } | null;
}

export function getLimitOrdersSignature(
  limitOrders: LimitOrderOverlayInput[] | undefined,
): string {
  return (limitOrders ?? [])
    .map(
      (order) => `${order.id ?? ''}:${order.price ?? ''}:${order.side ?? ''}`,
    )
    .join('|');
}

export function shouldRedrawLimitOrderLines(
  previousSignature: string,
  nextOrders: LimitOrderOverlayInput[] | undefined,
): boolean {
  return previousSignature !== getLimitOrdersSignature(nextOrders);
}

export function clearLimitOrderLines(host: LimitOverlayHost): void {
  if (!host.candlestickSeries || !host.priceLines.limitOrders) {
    host.priceLines.limitOrders = [];
    host.lastLimitOrderPrices = [];
    host.lastLimitOrderSignature = '';
    return;
  }
  host.priceLines.limitOrders.forEach((item) => {
    try {
      host.candlestickSeries?.removePriceLine(item.line || item);
    } catch (error) {
      console.error('TradingView: Error removing limit order line:', error);
    }
  });
  host.priceLines.limitOrders = [];
  host.lastLimitOrderPrices = [];
  host.lastLimitOrderSignature = '';
}

export function updateLimitOrderLines(
  host: LimitOverlayHost,
  limitOrders: LimitOrderOverlayInput[] | undefined,
  colors: { sell: string; buy: string },
): void {
  const nextSignature = getLimitOrdersSignature(limitOrders);
  if (nextSignature === host.lastLimitOrderSignature) {
    return;
  }
  clearLimitOrderLines(host);
  host.lastLimitOrderSignature = nextSignature;
  host.lastLimitOrderPrices = (limitOrders ?? [])
    .map((order) => order.price)
    .filter(
      (price): price is string | number =>
        price !== undefined && price !== null && price !== '',
    );
  if (!host.candlestickSeries || !limitOrders?.length) {
    return;
  }
  limitOrders.forEach((order) => {
    const price = Number.parseFloat(String(order.price));
    if (Number.isNaN(price)) {
      return;
    }
    try {
      const color = order.side === 'sell' ? colors.sell : colors.buy;
      const priceLine = host.candlestickSeries?.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Limit',
      });
      host.priceLines.limitOrders.push({
        line: priceLine,
        price,
        side: order.side,
      });
    } catch (error) {
      console.error('TradingView: Error creating limit order line:', error);
    }
  });
}

/**
 * WebView helpers for limit price lines. Autoscale stays on the
 * candlestick autoscaleInfoProvider; this never calls applyOptions.
 */
export function createLimitOrderOverlayScript(colors: {
  sell: string;
  buy: string;
}): string {
  return `
        window.getLimitOrdersSignature = function(limitOrders) {
            return (limitOrders || []).map(function(order) {
                return (order.id || '') + ':' + (order.price || '') + ':' + (order.side || '');
            }).join('|');
        };

        window.clearLimitOrderLines = function() {
            if (!window.candlestickSeries || !window.priceLines.limitOrders) {
                if (window.priceLines) {
                    window.priceLines.limitOrders = [];
                }
                window.lastLimitOrderPrices = [];
                window.lastLimitOrderSignature = '';
                return;
            }
            window.priceLines.limitOrders.forEach(function(item) {
                try {
                    window.candlestickSeries.removePriceLine(item.line || item);
                } catch (error) {
                    console.error('TradingView: Error removing limit order line:', error);
                }
            });
            window.priceLines.limitOrders = [];
            window.lastLimitOrderPrices = [];
            window.lastLimitOrderSignature = '';
        };

        window.updateLimitOrderLines = function(limitOrders) {
            var nextSignature = window.getLimitOrdersSignature(limitOrders);
            if (nextSignature === window.lastLimitOrderSignature) {
                return;
            }
            window.clearLimitOrderLines();
            window.lastLimitOrderSignature = nextSignature;
            window.lastLimitOrderPrices = (limitOrders || []).map(function(order) {
                return order && order.price;
            }).filter(function(price) {
                return price !== undefined && price !== null && price !== '';
            });
            if (!window.candlestickSeries || !limitOrders || !limitOrders.length) {
                return;
            }
            limitOrders.forEach(function(order) {
                var price = parseFloat(order.price);
                if (isNaN(price)) {
                    return;
                }
                try {
                    var color = order.side === 'sell'
                        ? '${colors.sell}'
                        : '${colors.buy}';
                    var priceLine = window.candlestickSeries.createPriceLine({
                        price: price,
                        color: color,
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'Limit'
                    });
                    window.priceLines.limitOrders.push({
                        line: priceLine,
                        price: price,
                        side: order.side
                    });
                } catch (error) {
                    console.error('TradingView: Error creating limit order line:', error);
                }
            });
        };
`;
}
