import { CaipChainId } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { RPC } from '../../../../constants/network';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../util/networks';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { getTransactionUrl as getNonEvmTransactionUrl } from '../../../../core/Multichain/utils';

export interface ActivityExplorerLink {
  url: string;
  title: string;
}

function isEvmChainId(chainId: string): boolean {
  return chainId.startsWith('eip155:') || chainId.startsWith('0x');
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Resolves the block-explorer transaction link ({ url, title }) for a given
 * chain id + hash, independent of the globally selected network. Returns
 * `undefined` when no explorer is configured or there is no hash.
 */
export function useActivityBlockExplorer(
  chainId: string | undefined,
  hash: string | undefined,
): ActivityExplorerLink | undefined {
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  if (!chainId || !hash) {
    return undefined;
  }

  if (isEvmChainId(chainId)) {
    const base = findBlockExplorerUrlForChain(chainId, networkConfigurations);
    if (!base) {
      return undefined;
    }
    const { url, title } = getBlockExplorerTxUrl(RPC, hash, base);
    return url ? { url, title } : undefined;
  }

  const url = getNonEvmTransactionUrl(hash, chainId as CaipChainId);
  return url ? { url, title: hostnameOf(url) } : undefined;
}
