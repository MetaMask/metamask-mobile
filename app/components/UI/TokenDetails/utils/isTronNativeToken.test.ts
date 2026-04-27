import type { TokenI } from '../../Tokens/types';
import { isTronNativeToken } from './isTronNativeToken';

describe('isTronNativeToken', () => {
  it('returns true for TRX ticker on Tron chain', () => {
    const token = {
      address: 'tron:token',
      chainId: 'tron:728126428',
      ticker: 'TRX',
      symbol: 'TRX',
      name: 'TRON',
      decimals: 6,
      balance: '10',
      balanceFiat: '$1.00',
      logo: '',
      image: '',
      isETH: false,
      hasBalanceError: false,
      aggregators: [],
    } as TokenI;

    expect(isTronNativeToken(token)).toBe(true);
  });

  it('returns false when ticker is missing even if symbol is TRX', () => {
    const token = {
      address: 'tron:token',
      chainId: 'tron:728126428',
      symbol: 'TRX',
      name: 'TRON',
      decimals: 6,
      balance: '10',
      balanceFiat: '$1.00',
      logo: '',
      image: '',
      isETH: false,
      hasBalanceError: false,
      aggregators: [],
    } as TokenI;

    expect(isTronNativeToken(token)).toBe(false);
  });
});
