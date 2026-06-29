import { useSelector } from 'react-redux';
import { RPC } from '../../../../constants/network';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../util/networks';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';

export interface ActivityExplorerLink {
  url: string;
  title: string;
}

function isEvmChainId(chainId: string): boolean {
  return chainId.startsWith('eip155:') || chainId.startsWith('0x');
}

/** Builds a non-EVM explorer tx url from its (possibly templated) base url. */
function buildNonEvmTxUrl(base: string, hash: string): string {
  if (/\{.*?\}/u.test(base)) {
    return base.replace(/\{.*?\}/u, hash);
  }
  return `${base.replace(/\/$/u, '')}/tx/${hash}`;
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

  const base = findBlockExplorerUrlForChain(chainId, networkConfigurations);
  if (!base) {
    return undefined;
  }

  if (isEvmChainId(chainId)) {
    const { url, title } = getBlockExplorerTxUrl(RPC, hash, base);
    return url ? { url, title } : undefined;
  }

  const url = buildNonEvmTxUrl(base, hash);
  return { url, title: hostnameOf(url) };
}
