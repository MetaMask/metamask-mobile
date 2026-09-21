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

  it('does not apply metadata decimals when the amount is already human-readable', () => {
    expect(
      getHumanReadableTokenAmount({
        amount: '1',
        decimals: 9,
        direction: 'out',
        symbol: 'SOL',
        amountIsHumanReadable: true,
      }),
    ).toBe('1');
  });

  it('treats an integer amount as atomic units when decimals are set and the amount is not marked human-readable', () => {
    expect(
      getHumanReadableTokenAmount({
        amount: '1',
        decimals: 9,
        direction: 'out',
        symbol: 'SOL',
      }),
    ).toBe('0.000000001');
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

  it('does not invent 0 when an EVM mapper omitted the amount (fail-closed)', () => {
    expect(
      getHumanReadableTokenAmount({
        direction: 'out',
        symbol: 'USDT',
        assetId:
          'eip155:42161/erc20:0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        assetType: 'erc20',
      }),
    ).toBeUndefined();
    expect(
      getHumanReadableTokenAmount({
        direction: 'out',
        symbol: 'ETH',
        assetId: 'eip155:1/slip44:60',
        assetType: 'native',
      }),
    ).toBeUndefined();
  });

  it('omits an EVM mapper amount whose decimals are unknown rather than treating it as atomic', () => {
    expect(
      getHumanReadableTokenAmount({
        amount: '167121100',
        direction: 'out',
        symbol: 'USDT',
        assetType: 'erc20',
      }),
    ).toBeUndefined();
    expect(
      getHumanReadableTokenAmount({
        amount: '1000000000000000',
        direction: 'out',
        assetType: 'native',
      }),
    ).toBeUndefined();
  });

  it('keeps amounts from sources that omit decimals on already-human values', () => {
    expect(
      getHumanReadableTokenAmount({
        amount: '30',
        direction: 'in',
        symbol: 'USDC',
        assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      }),
    ).toBe('30');
    expect(
      getHumanReadableTokenAmount({
        amount: '1.5',
        direction: 'out',
        symbol: 'SOL',
      }),
    ).toBe('1.5');
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
