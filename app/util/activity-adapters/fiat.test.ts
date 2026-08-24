import {
  applyDisplaySign,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
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

  it('treats a missing amount with symbol/assetId as zero for client-utils natives', () => {
    expect(
      getHumanReadableTokenAmount({
        direction: 'out',
        symbol: 'ETH',
        assetId: 'eip155:1/slip44:60',
      }),
    ).toBe('0');
    expect(
      getHumanReadableTokenAmount({
        direction: 'out',
      }),
    ).toBeUndefined();
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
