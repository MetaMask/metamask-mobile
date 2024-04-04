import PopularList from './customNetworks';
import { toHex } from '@metamask/controller-utils';

describe('popularNetwork', () => {
  it('should have correct chainIds for all popular network', () => {
    const expectedChainIds: { [key: string]: string } = {
      'Arbitrum One': toHex('42161'),
      'Avalanche Network C-Chain': toHex('43114'),
      'BNB Chain': toHex('56'),
      'Base Mainnet': toHex('8453'),
      'OP Mainnet': toHex('10'),
      'Polygon Mainnet': toHex('137'),
      'zkSync Era Mainnet': toHex('324'),
    };

    PopularList.forEach((rpc) => {
      expect(rpc.chainId).toBe(expectedChainIds[rpc.nickname]);
    });
  });
});
