import {
  PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  buildDefaultProMarket,
} from './perpsModeSwitch';

describe('perpsModeSwitch', () => {
  it('defaults the Pro market symbol to BTC', () => {
    expect(PERPS_DEFAULT_PRO_MARKET_SYMBOL).toBe('BTC');
  });

  it('builds a minimal default Pro market payload', () => {
    // Act
    const market = buildDefaultProMarket();

    // Assert
    expect(market.symbol).toBe(PERPS_DEFAULT_PRO_MARKET_SYMBOL);
  });
});
