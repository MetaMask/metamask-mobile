import { isSolanaChainId } from '@metamask/bridge-controller';
import { CaipChainId } from '@metamask/utils';

export const mapCaipChainIdToChainName = (caipChainId: CaipChainId): string => {
  if (isSolanaChainId(caipChainId)) {
    return 'Solana';
  }

  return 'Linea';
};
