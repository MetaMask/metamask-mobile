import { getTradeSubtitle } from './index';
import type { BridgeToken } from '../../types';

const sourceToken = {
  symbol: 'ETH',
} as BridgeToken;

const destToken = {
  symbol: 'USDC',
} as BridgeToken;

describe('getTradeSubtitle', () => {
  it('formats token amounts like secondary token values in token inputs', () => {
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
