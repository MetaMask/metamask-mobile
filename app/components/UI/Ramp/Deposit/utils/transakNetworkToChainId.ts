import { CaipChainId } from '@metamask/utils';
import { TRANSAK_NETWORKS } from '../constants';

function transakNetworkToChainId(network: string): CaipChainId {
  return TRANSAK_NETWORKS[network];
}
export default transakNetworkToChainId;
