import { isStockRwaBridgeToken } from './isStockRwaBridgeToken';
import type { BridgeToken } from '../types';

const baseToken: BridgeToken = {
  address: '0x1',
  symbol: 'T',
  decimals: 18,
  chainId: '0x1',
};

describe('isStockRwaBridgeToken', () => {
  it('returns false when RWA feature is off', () => {
    expect(
      isStockRwaBridgeToken(
        {
          ...baseToken,
          rwaData: { instrumentType: 'stock' } as BridgeToken['rwaData'],
        },
        false,
      ),
    ).toBe(false);
  });

  it('returns true when feature on and instrument is stock', () => {
    expect(
      isStockRwaBridgeToken(
        {
          ...baseToken,
          rwaData: { instrumentType: 'stock' } as BridgeToken['rwaData'],
        },
        true,
      ),
    ).toBe(true);
  });

  it('returns false when instrument is not stock', () => {
    expect(
      isStockRwaBridgeToken(
        {
          ...baseToken,
          rwaData: { instrumentType: 'bond' } as BridgeToken['rwaData'],
        },
        true,
      ),
    ).toBe(false);
  });

  it('returns false when token is undefined', () => {
    expect(isStockRwaBridgeToken(undefined, true)).toBe(false);
  });
});
