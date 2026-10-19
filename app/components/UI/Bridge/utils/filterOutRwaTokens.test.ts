import { filterOutRwaTokens } from './filterOutRwaTokens';
import type { BridgeToken } from '../types';

const baseToken: BridgeToken = {
  address: '0x1',
  symbol: 'T',
  decimals: 18,
  chainId: '0x1',
};

describe('filterOutRwaTokens', () => {
  it('removes tokens carrying rwaData', () => {
    const plainToken = { ...baseToken, symbol: 'USDC' };
    const rwaToken = {
      ...baseToken,
      address: '0x2',
      symbol: 'AAPLx',
      rwaData: { instrumentType: 'stock' } as BridgeToken['rwaData'],
    };

    expect(filterOutRwaTokens([plainToken, rwaToken])).toStrictEqual([
      plainToken,
    ]);
  });

  it('removes tokens with rwaData regardless of instrument type', () => {
    const bondToken = {
      ...baseToken,
      rwaData: { instrumentType: 'bond' } as BridgeToken['rwaData'],
    };

    expect(filterOutRwaTokens([bondToken])).toStrictEqual([]);
  });

  it('removes Ondo Tokenized tokens matched by name', () => {
    const ondoToken = { ...baseToken, name: 'Ondo Tokenized Tesla' };

    expect(filterOutRwaTokens([ondoToken])).toStrictEqual([]);
  });

  it('keeps tokens without rwaData or an Ondo Tokenized name', () => {
    const tokens = [
      { ...baseToken, name: 'USD Coin' },
      { ...baseToken, address: '0x2', name: undefined },
    ];

    expect(filterOutRwaTokens(tokens)).toStrictEqual(tokens);
  });

  it('returns an empty array for an empty list', () => {
    expect(filterOutRwaTokens([])).toStrictEqual([]);
  });

  it('preserves extra properties on the token shape', () => {
    const watchlistToken = { ...baseToken, assetId: 'eip155:1/slip44:60' };

    expect(filterOutRwaTokens([watchlistToken])).toStrictEqual([
      watchlistToken,
    ]);
  });
});
