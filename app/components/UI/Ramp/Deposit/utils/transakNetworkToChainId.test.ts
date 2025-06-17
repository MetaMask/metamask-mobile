import transakNetworkToChainId from './transakNetworkToChainId';
import { CaipChainId } from '@metamask/utils';
import { TRANSAK_NETWORKS } from '../constants';

describe('transakNetworkToChainId', () => {
  it('should return the correct CaipChainId for a valid network', () => {
    const network = 'ethereum';
    const expectedChainId: CaipChainId = TRANSAK_NETWORKS[network];
    expect(transakNetworkToChainId(network)).toBe(expectedChainId);
  });

  it('should return undefined for an invalid network', () => {
    const network = 'invalidNetwork';
    expect(transakNetworkToChainId(network)).toBeUndefined();
  });
});
