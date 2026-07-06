import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { getTokenKey } from './tokenKey';

describe('getTokenKey', () => {
  it('returns address:chainId with the address lowercased', () => {
    const token = {
      address: '0xABCD',
      chainId: '0x1',
    } as unknown as BridgeToken;

    expect(getTokenKey(token)).toBe('0xabcd:0x1');
  });

  it('handles already lowercase addresses', () => {
    const token = {
      address: '0xabcd',
      chainId: '0x89',
    } as unknown as BridgeToken;

    expect(getTokenKey(token)).toBe('0xabcd:0x89');
  });
});
