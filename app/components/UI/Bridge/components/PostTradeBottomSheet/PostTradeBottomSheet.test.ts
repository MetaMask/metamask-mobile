import { getTradeSubtitle } from './index';
import type { BridgeToken } from '../../types';

const sourceToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1',
  decimals: 18,
  symbol: 'ETH',
} as BridgeToken;

const destToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1',
  decimals: 6,
  symbol: 'USDC',
} as BridgeToken;

describe('getTradeSubtitle', () => {
  it('formats token amounts like secondary token values in token inputs', () => {
    expect(
      getTradeSubtitle({
        sourceAmount: '1.230009',
        destAmount: '57.056221',
        sourceToken,
        destToken,
      }),
    ).toBe('1.23 ETH → 57.05622 USDC');
  });

  it('applies locale separators after truncating secondary token amounts', () => {
    expect(
      getTradeSubtitle({
        sourceAmount: '12345.678901',
        destAmount: '9876543.210987',
        sourceToken,
        destToken,
      }),
    ).toBe('12,345.6789 ETH → 9,876,543.21098 USDC');
  });
});
