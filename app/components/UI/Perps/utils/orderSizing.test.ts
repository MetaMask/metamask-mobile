import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import {
  deriveOrderSizing,
  getMaxAllowedAmountAtExecutionPrice,
  getProspectiveExecutionPrice,
  getReduceOnlyMaxUsdAmount,
  getTriggerMarketSlippageCapPrice,
} from './orderSizing';

describe('deriveOrderSizing', () => {
  const base = {
    amount: '100',
    marketPrice: 90000,
    markPrice: 90050,
    leverage: 5,
    szDecimals: 3,
    isLoadingMarketData: false,
  };

  it('uses the market price as the effective price for market orders', () => {
    // Arrange / Act
    const result = deriveOrderSizing({ ...base, orderType: 'market' });

    // Assert
    expect(result.effectivePrice).toBe(90000);
    expect(result.positionSize).not.toBe(PERPS_CONSTANTS.FallbackDataDisplay);
    expect(result.marginRequired).toBeDefined();
  });

  it('uses a valid limit price as the effective price for limit orders', () => {
    // Arrange / Act
    const result = deriveOrderSizing({
      ...base,
      orderType: 'limit',
      limitPrice: '80000',
    });

    // Assert
    expect(result.effectivePrice).toBe(80000);
  });

  it('falls back to the market price when a limit order has no/zero limit price', () => {
    // Arrange / Act
    const result = deriveOrderSizing({
      ...base,
      orderType: 'limit',
      limitPrice: '0',
    });

    // Assert
    expect(result.effectivePrice).toBe(90000);
  });

  it('returns the fallback position size and no margin while market data loads', () => {
    // Arrange / Act
    const result = deriveOrderSizing({
      ...base,
      orderType: 'market',
      isLoadingMarketData: true,
    });

    // Assert
    expect(result.positionSize).toBe(PERPS_CONSTANTS.FallbackDataDisplay);
    expect(result.marginRequired).toBeUndefined();
  });

  it('returns no margin when the amount is empty', () => {
    // Arrange / Act
    const result = deriveOrderSizing({
      ...base,
      amount: '',
      orderType: 'market',
    });

    // Assert
    expect(result.marginRequired).toBeUndefined();
  });

  it('uses the mark price (not market price) as the margin basis for market orders', () => {
    // Arrange / Act: with a distinct markPrice, margin reflects the oracle basis
    const withMark = deriveOrderSizing({
      ...base,
      orderType: 'market',
      markPrice: 100000,
    });
    const withoutMark = deriveOrderSizing({
      ...base,
      orderType: 'market',
      markPrice: 90000,
    });

    // Assert
    expect(withMark.marginRequired).not.toBe(withoutMark.marginRequired);
  });

  it('falls back to default size decimals when szDecimals is null', () => {
    // Arrange / Act
    const result = deriveOrderSizing({
      ...base,
      orderType: 'market',
      szDecimals: null,
    });

    // Assert
    expect(result.positionSize).not.toBe(PERPS_CONSTANTS.FallbackDataDisplay);
  });

  it('uses the limit price as the effective price for trigger-limit orders', () => {
    const result = deriveOrderSizing({
      ...base,
      orderType: 'stop_limit',
      limitPrice: '88000',
      triggerPrice: '91000',
    });

    expect(result.effectivePrice).toBe(88000);
  });

  it('uses the trigger price as the effective price for trigger-market orders', () => {
    const result = deriveOrderSizing({
      ...base,
      orderType: 'take_profit_market',
      triggerPrice: '87000',
      limitPrice: '80000',
    });

    expect(result.effectivePrice).toBe(87000);
  });

  it('keeps trigger size price separate from the slippage-buffered margin price', () => {
    const result = deriveOrderSizing({
      ...base,
      amount: '1000',
      orderType: 'stop_market',
      triggerPrice: '90000',
      isBuy: true,
      maxSlippageBps: 1000,
    });

    expect(result.effectivePrice).toBe(90000);
    expect(result.marginPrice).toBe(99000);
  });

  it('falls back to the market price when a trigger-market order has no trigger', () => {
    const result = deriveOrderSizing({
      ...base,
      orderType: 'stop_market',
      triggerPrice: '0',
    });

    expect(result.effectivePrice).toBe(90000);
  });
});

describe('getTriggerMarketSlippageCapPrice', () => {
  it('calculates a buy-side cap and applies venue precision', () => {
    expect(
      getTriggerMarketSlippageCapPrice({
        triggerPrice: '90000',
        isBuy: true,
        maxSlippageBps: 1000,
        szDecimals: 3,
      }),
    ).toBe(99000);
  });

  it('calculates a sell-side cap', () => {
    expect(
      getTriggerMarketSlippageCapPrice({
        triggerPrice: '90000',
        isBuy: false,
        maxSlippageBps: 1000,
        szDecimals: 3,
      }),
    ).toBe(81000);
  });
});

describe('getMaxAllowedAmountAtExecutionPrice', () => {
  it('reduces a buy maximum when the capped execution price is higher', () => {
    const uncapped = getMaxAllowedAmountAtExecutionPrice({
      spendableBalance: 1000,
      sizePrice: 90000,
      executionPrice: 90000,
      assetSzDecimals: 3,
      leverage: 5,
    });
    const capped = getMaxAllowedAmountAtExecutionPrice({
      spendableBalance: 1000,
      sizePrice: 90000,
      executionPrice: 99000,
      assetSzDecimals: 3,
      leverage: 5,
    });

    expect(capped).toBeLessThan(uncapped);
  });
});

describe('getProspectiveExecutionPrice', () => {
  it('prefers limit price for limit-execution types and trigger price for trigger-market', () => {
    expect(
      getProspectiveExecutionPrice({
        orderType: 'limit',
        limitPrice: '80000',
        triggerPrice: '91000',
        marketPrice: 90000,
      }),
    ).toBe(80000);
    expect(
      getProspectiveExecutionPrice({
        orderType: 'stop_market',
        limitPrice: '80000',
        triggerPrice: '91000',
        marketPrice: 90000,
      }),
    ).toBe(91000);
    expect(
      getProspectiveExecutionPrice({
        orderType: 'market',
        limitPrice: '80000',
        triggerPrice: '91000',
        marketPrice: 90000,
      }),
    ).toBe(90000);
  });
});

describe('getReduceOnlyMaxUsdAmount', () => {
  it('returns the USD notional of a long position', () => {
    const result = getReduceOnlyMaxUsdAmount({
      positionSize: '0.5',
      price: 90000,
    });

    expect(result).toBe(45000);
  });

  it('uses the absolute size of a short position', () => {
    const result = getReduceOnlyMaxUsdAmount({
      positionSize: '-1',
      price: 90000,
    });

    expect(result).toBe(90000);
  });

  it('returns 0 when size is missing, zero, or non-numeric', () => {
    expect(getReduceOnlyMaxUsdAmount({ price: 90000 })).toBe(0);
    expect(getReduceOnlyMaxUsdAmount({ positionSize: '0', price: 90000 })).toBe(
      0,
    );
    expect(
      getReduceOnlyMaxUsdAmount({ positionSize: 'abc', price: 90000 }),
    ).toBe(0);
  });

  it('returns 0 when price is missing or non-positive', () => {
    expect(getReduceOnlyMaxUsdAmount({ positionSize: '1', price: 0 })).toBe(0);
    expect(
      getReduceOnlyMaxUsdAmount({ positionSize: '1', price: Number.NaN }),
    ).toBe(0);
  });
});
