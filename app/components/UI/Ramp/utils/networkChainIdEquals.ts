import { isCaipChainId } from '@metamask/utils';

function networkChainIdEquals(network: string, chainId: string): boolean {
  if (network == null || chainId == null || network === '' || chainId === '') {
    return false;
  }
  if (network === chainId) {
    return true;
  }

  if (isCaipChainId(network) && network.startsWith('eip155:')) {
    const networkChainId = network.split(':')[1];
    return networkChainId === chainId;
  }

  return false;
}
export default networkChainIdEquals;
