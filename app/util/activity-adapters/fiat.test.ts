import {
  applyDisplaySign,
  calculateFiatFromMarketRates,
  formatTokenQuantity,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
  getTokenAddressForMarketRates,
  type MarketRateLookupToken,
  toMarketRateLookupToken,
} from './fiat';
import { NATIVE_TOKEN_ADDRESS } from './adapters/shims';

const ethToken: MarketRateLookupToken = {
  address: NATIVE_TOKEN_ADDRESS,
  symbol: 'ETH',
  decimals: 18,
  chainId: '0x1',
};

describe('activity adapter fiat helpers', () => {
  describe('calculateFiatFromMarketRates', () => {
    const marketRates = {
      1: { [NATIVE_TOKEN_ADDRESS]: 2500 },
    };

    it('returns fiat amount for a valid token and amount', () => {
      expect(calculateFiatFromMarketRates('1.5', ethToken, marketRates)).toBe(
        3750,
      );
    });

    it('preserves sign for negative amounts', () => {
      expect(calculateFiatFromMarketRates('-1', ethToken, marketRates)).toBe(
        -2500,
      );
    });

    it('parses leading plus amounts', () => {
      expect(calculateFiatFromMarketRates('+1.5', ethToken, marketRates)).toBe(
        3750,
      );
    });

    it('returns undefined when amount, token, or rate is missing', () => {
      expect(
        calculateFiatFromMarketRates(undefined, ethToken, marketRates),
      ).toBeUndefined();
      expect(calculateFiatFromMarketRates('1', undefined, marketRates)).toBe(
        undefined,
      );
      expect(
        calculateFiatFromMarketRates('1', ethToken, { 1: {} }),
      ).toBeUndefined();
    });
  });

  it('returns an unsigned human-readable token amount', () => {
    expect(
      getHumanReadableTokenAmount({
        amount: '1000000000000000000',
        decimals: 18,
        direction: 'out',
        symbol: 'ETH',
      }),
    ).toBe('1');
  });

  it('formats token quantities for activity displays', () => {
    expect(formatTokenQuantity('1.714557')).toBe('1.7146');
    expect(formatTokenQuantity('0.000745596683158496')).toBe('0.0007456');
    expect(formatTokenQuantity('0.000001')).toBe('<0.00001');
  });

  it('returns no prefix for incoming amounts when plus is disabled', () => {
    expect(getDisplaySignPrefix('in', { showPlus: false })).toBe('');
  });

  it('applies display signs without duplicating existing signs', () => {
    expect(applyDisplaySign('$2,500.00', '+')).toBe('+$2,500.00');
    expect(applyDisplaySign('+$2,500.00', '+')).toBe('+$2,500.00');
    expect(applyDisplaySign('-$2,500.00', '+')).toBe('-$2,500.00');
    expect(applyDisplaySign('1.5 ETH', '-')).toBe('-1.5 ETH');
    expect(applyDisplaySign('-$2,500.00', '-')).toBe('-$2,500.00');
    expect(applyDisplaySign('+$2,500.00', '-')).toBe('+$2,500.00');
    expect(applyDisplaySign('1.5 ETH', '')).toBe('1.5 ETH');
  });

  it('maps CAIP asset ids to market-rate token addresses', () => {
    expect(getTokenAddressForMarketRates('eip155:1/slip44:60')).toBe(
      NATIVE_TOKEN_ADDRESS,
    );
    expect(
      getTokenAddressForMarketRates(
        'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      ),
    ).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
  });

  it('builds a market-rate lookup token from an activity token amount', () => {
    expect(
      toMarketRateLookupToken(
        {
          amount: '1',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
          assetId: 'eip155:1/slip44:60',
        },
        '0x1',
      ),
    ).toStrictEqual(ethToken);
  });
});
