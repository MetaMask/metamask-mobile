import {
  PopularList,
  getNonEvmNetworkImageSourceByChainId,
} from './customNetworks';
import { toHex } from '@metamask/controller-utils';
import { SolScope } from '@metamask/keyring-api';
import { CaipChainId } from '@metamask/utils';

describe('popularNetwork', () => {
  it('should have correct chainIds for all popular network', () => {
    const expectedChainIds: { [key: string]: string } = {
      'Avalanche C-Chain': toHex('43114'),
      'Arbitrum One': toHex('42161'),
      'BNB Smart Chain Mainnet': toHex('56'),
      Base: toHex('8453'),
      'OP Mainnet': toHex('10'),
      Palm: toHex('11297108109'),
      'Polygon Mainnet': toHex('137'),
      'zkSync Mainnet': toHex('324'),
      'Sei Mainnet': toHex('1329'),
    };

    PopularList.forEach((rpc) => {
      expect(rpc.chainId).toBe(expectedChainIds[rpc.nickname]);
    });
  });
});

describe('getNonEvmNetworkImageSourceByChainId', () => {
  it('should return image source for valid non-EVM network chainId', () => {
    const imageSource = getNonEvmNetworkImageSourceByChainId(SolScope.Mainnet);
    expect(imageSource).toBeDefined();
  });

  it('should return undefined for invalid chainId', () => {
    const invalidChainId = 'invalid:chain:id' as CaipChainId;
    const imageSource = getNonEvmNetworkImageSourceByChainId(invalidChainId);
    expect(imageSource).toBeUndefined();
  });
});
