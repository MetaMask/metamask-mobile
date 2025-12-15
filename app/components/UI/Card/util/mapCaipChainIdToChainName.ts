import { CaipChainId } from '@metamask/utils';
import { caipChainIdToNetwork } from '../constants';

export const mapCaipChainIdToChainName = (caipChainId: CaipChainId): string => {
  const network = caipChainIdToNetwork[caipChainId];

  if (!network) {
    return 'Linea';
  }

  return network.charAt(0).toUpperCase() + network.slice(1);
};
