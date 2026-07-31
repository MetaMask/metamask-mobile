import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { deriveOrderSizing } from './orderSizing';

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
});
