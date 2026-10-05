import type { BridgeToken } from '../Bridge/types';
import { isSameAsset } from './tokenSelection';

describe('isSameAsset', () => {
  it('matches Polygon native address representations on the same chain', () => {
    const token = {
      address: '0x0000000000000000000000000000000000000000',
      chainId: '0x89',
      symbol: 'POL',
    } as BridgeToken;

    expect(
      isSameAsset(token, {
        address: '0x0000000000000000000000000000000000001010',
        chainId: '0x89',
      }),
    ).toBe(true);
  });
});
