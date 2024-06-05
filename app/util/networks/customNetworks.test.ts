import { PopularList } from './customNetworks';
import { toHex } from '@metamask/controller-utils';

describe('popularNetwork', () => {
  it('should have correct chainIds for all popular network', () => {
    const expectedChainIds: { [key: string]: string } = {
      'Avalanche Mainnet C-Chain': toHex('43114'),
      'Arbitrum One': toHex('42161'),
      'BNB Chain': toHex('56'),
      Base: toHex('8453'),
      Optimism: toHex('10'),
      Palm: toHex('11297108109'),
      'Polygon Mainnet': toHex('137'),
      'zkSync Era Mainnet': toHex('324'),
    };

    PopularList.forEach((rpc) => {
      expect(rpc.chainId).toBe(expectedChainIds[rpc.nickname]);
    });
  });
});
