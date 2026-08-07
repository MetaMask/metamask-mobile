import { ORDER_SLIPPAGE_CONFIG } from '@metamask/perps-controller';
import {
  buildPerpsOrderParams,
  buildPerpsOrderTrackingData,
  buildEditOrderParamsFromOrder,
} from './orderParams';

const trackingData = buildPerpsOrderTrackingData({
  marginRequired: '20',
  feeResults: {
    totalFee: 5,
    metamaskFee: 1,
    metamaskFeeRate: 0.01,
    feeDiscountPercentage: 10,
    estimatedPoints: 100,
  },
  marketPrice: 90000,
  inputMethod: 'default' as const,
  direction: 'long',
  chartLibrary: 'lightweight',
});

describe('buildPerpsOrderParams', () => {
  const base = {
    asset: 'BTC',
    isBuy: true,
    size: '0.001',
    effectivePrice: 90000,
    leverage: 5,
    usdAmount: '100',
    maxSlippageBps: 100,
    trackingData,
  };

  it('builds a market order without a price and with the user max slippage', () => {
    // Arrange / Act
    const params = buildPerpsOrderParams({ ...base, orderType: 'market' });

    // Assert
    expect(params).toMatchObject({
      symbol: 'BTC',
      isBuy: true,
      orderType: 'market',
      currentPrice: 90000,
      priceAtCalculation: 90000,
      usdAmount: '100',
      maxSlippageBps: 100,
    });
    expect(params).not.toHaveProperty('price');
    expect(params).not.toHaveProperty('reduceOnly');
    expect(params).not.toHaveProperty('takeProfitPrice');
  });

  it('builds a limit order with the price and the fixed default slippage', () => {
    // Arrange / Act
    const params = buildPerpsOrderParams({
      ...base,
      orderType: 'limit',
      limitPrice: '80000',
    });

    // Assert
    expect(params.price).toBe('80000');
    expect(params.maxSlippageBps).toBe(
      ORDER_SLIPPAGE_CONFIG.DefaultLimitSlippageBps,
    );
  });

  it('includes reduceOnly when provided (including false)', () => {
    // Arrange / Act
    const on = buildPerpsOrderParams({
      ...base,
      orderType: 'market',
      reduceOnly: true,
    });
    const off = buildPerpsOrderParams({
      ...base,
      orderType: 'market',
      reduceOnly: false,
    });

    // Assert
    expect(on.reduceOnly).toBe(true);
    expect(off.reduceOnly).toBe(false);
  });

  it('includes TP/SL only when non-empty after trimming', () => {
    // Arrange / Act
    const withTpSl = buildPerpsOrderParams({
      ...base,
      orderType: 'market',
      takeProfitPrice: '95000',
      stopLossPrice: ' ',
    });

    // Assert
    expect(withTpSl.takeProfitPrice).toBe('95000');
    expect(withTpSl).not.toHaveProperty('stopLossPrice');
  });
});

describe('buildPerpsOrderTrackingData', () => {
  const base = {
    marginRequired: '20',
    feeResults: {
      totalFee: 5,
      metamaskFee: 1,
      metamaskFeeRate: 0.01,
      feeDiscountPercentage: 10,
      estimatedPoints: 100,
    },
    marketPrice: 90000,
    inputMethod: 'default' as const,
    direction: 'long' as const,
    chartLibrary: 'lightweight',
  };

  it('marks trades without a custom token and omits pay-token fields', () => {
    // Arrange / Act
    const result = buildPerpsOrderTrackingData(base) as Record<string, unknown>;

    // Assert
    expect(result.tradeWithToken).toBe(false);
    expect(result).not.toHaveProperty('mmPayTokenSelected');
    expect(result.marginUsed).toBe(20);
  });

  it('includes pay-token fields when a custom token is selected', () => {
    // Arrange / Act
    const result = buildPerpsOrderTrackingData({
      ...base,
      hasCustomTokenSelected: true,
      payToken: { symbol: 'USDC', chainId: 42161 },
    }) as Record<string, unknown>;

    // Assert
    expect(result.tradeWithToken).toBe(true);
    expect(result.mmPayTokenSelected).toBe('USDC');
    expect(result.mmPayNetworkSelected).toBe('42161');
  });

  it('includes hlFeeRate only when the protocol fee rate is defined', () => {
    // Arrange / Act
    const withRate = buildPerpsOrderTrackingData({
      ...base,
      feeResults: { ...base.feeResults, protocolFeeRate: 0.02 },
    }) as Record<string, unknown>;
    const withoutRate = buildPerpsOrderTrackingData(base) as Record<
      string,
      unknown
    >;

    // Assert
    expect(withRate.hlFeeRate).toBe(0.02);
    expect(withoutRate).not.toHaveProperty('hlFeeRate');
  });
});

describe('buildEditOrderParamsFromOrder', () => {
  const order = {
    orderId: 'order-1',
    symbol: 'ETH',
    side: 'sell' as const,
    size: '2',
    originalSize: '2',
    remainingSize: '2',
    filledSize: '0',
    price: '3000',
    orderType: 'limit' as const,
    status: 'open' as const,
    timestamp: 1_711_756_800_000, // 2024-03-30T00:00:00.000Z — fixed for determinism
    reduceOnly: true,
    isTrigger: false,
  };

  it('builds limit edit params with updated price and reduce-only flag', () => {
    const params = buildEditOrderParamsFromOrder({
      order,
      newLimitPrice: '3100',
      trackingData: { totalFee: 0, marketPrice: 3100, source: 'test' },
    });

    expect(params).toEqual(
      expect.objectContaining({
        symbol: 'ETH',
        isBuy: false,
        size: '2',
        orderType: 'limit',
        price: '3100',
        reduceOnly: true,
        currentPrice: 3100,
        priceAtCalculation: 3100,
        trackingData: expect.objectContaining({ source: 'test' }),
      }),
    );
  });

  it('builds limit edit params with updated size', () => {
    const params = buildEditOrderParamsFromOrder({
      order,
      newSize: '1.5',
      trackingData: { totalFee: 0, marketPrice: 3000, source: 'test' },
    });

    expect(params).toEqual(
      expect.objectContaining({
        symbol: 'ETH',
        isBuy: false,
        size: '1.5',
        orderType: 'limit',
        price: '3000',
        reduceOnly: true,
        currentPrice: 3000,
        priceAtCalculation: 3000,
      }),
    );
  });

  it('includes effective leverage in edit params when provided', () => {
    const params = buildEditOrderParamsFromOrder({
      order,
      newLimitPrice: '3100',
      leverage: 5,
      trackingData: { totalFee: 0, marketPrice: 3100, source: 'test' },
    });

    expect(params).toEqual(
      expect.objectContaining({
        leverage: 5,
        price: '3100',
      }),
    );
  });

  it('preserves attached take-profit and stop-loss prices on edit', () => {
    const params = buildEditOrderParamsFromOrder({
      order: {
        ...order,
        takeProfitPrice: '3500',
        stopLossPrice: '2500',
      },
      newLimitPrice: '3100',
      trackingData: { totalFee: 0, marketPrice: 3100, source: 'test' },
    });

    expect(params).toEqual(
      expect.objectContaining({
        takeProfitPrice: '3500',
        stopLossPrice: '2500',
        price: '3100',
      }),
    );
  });
});
