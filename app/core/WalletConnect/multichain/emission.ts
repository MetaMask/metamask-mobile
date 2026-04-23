import { KnownCaipNamespace } from '@metamask/utils';

import { getAdapter } from './registry';

/**
 * Minimal shape required to pick a `chainChanged` target. Structurally
 * matches both `ApprovedNamespaces` (our strict type) and WalletConnect's
 * `SessionTypes.Namespaces` (where every field is optional on persisted
 * sessions).
 */
export interface EmissionNamespaceSlice {
  chains?: string[];
  events?: string[];
}

export type EmissionNamespaces = Record<
  string,
  EmissionNamespaceSlice | undefined
>;

export interface ChainChangedEmission {
  chainId: string;
  data: string | number;
}

export type ChainChangedSkipReason =
  | 'chain_not_in_session'
  | 'event_not_supported';

export interface ChainChangedEmitDecision {
  shouldEmit: boolean;
  reason?: ChainChangedSkipReason;
  namespace?: string;
  activeSessionChains?: string[];
  namespaceEvents?: string[];
}

/**
 * Pick the CAIP chain id the wallet should emit `chainChanged` for and the
 * payload it should carry. Selects the namespace with the highest
 * `emissionPriority` (from the adapter registry) that has at least one
 * chain. Falls back to the EVM wallet state when no namespace qualifies.
 */
export const getChainChangedEmission = ({
  namespaces,
  fallbackEvmDecimal,
  fallbackEvmHex,
}: {
  namespaces?: EmissionNamespaces;
  fallbackEvmDecimal: number;
  fallbackEvmHex: string;
}): ChainChangedEmission => {
  const candidates = Object.entries(namespaces ?? {})
    .filter(
      (
        entry,
      ): entry is [string, { chains: string[] } & EmissionNamespaceSlice] =>
        entry[0] !== KnownCaipNamespace.Wallet &&
        Array.isArray(entry[1]?.chains) &&
        entry[1].chains.length > 0,
    )
    .map(([key, config]) => ({
      key,
      chain: config.chains[0],
      priority: getAdapter(key)?.emissionPriority ?? 0,
    }))
    .sort((a, b) => b.priority - a.priority);

  const winner = candidates[0];

  if (winner) {
    const isEvm = winner.key === KnownCaipNamespace.Eip155;
    return {
      chainId: winner.chain,
      data: isEvm ? fallbackEvmHex : winner.chain,
    };
  }

  return {
    chainId: `${KnownCaipNamespace.Eip155}:${fallbackEvmDecimal}`,
    data: fallbackEvmHex,
  };
};

/**
 * Decide whether the wallet should emit `chainChanged` for `chainId`.
 *
 * The chain must appear in some slice of the active session and the target
 * namespace must declare `chainChanged` in its events array.
 */
export const shouldEmitChainChanged = ({
  chainId,
  namespaces,
}: {
  chainId: string;
  namespaces?: EmissionNamespaces;
}): ChainChangedEmitDecision => {
  const activeSessionChains = Object.values(namespaces ?? {}).flatMap(
    (ns) => ns?.chains ?? [],
  );
  if (!activeSessionChains.includes(chainId)) {
    return {
      shouldEmit: false,
      reason: 'chain_not_in_session',
      activeSessionChains,
    };
  }

  const namespace = chainId.split(':')[0];
  const namespaceEvents = namespaces?.[namespace]?.events ?? [];
  if (!namespaceEvents.includes('chainChanged')) {
    return {
      shouldEmit: false,
      reason: 'event_not_supported',
      namespace,
      namespaceEvents,
    };
  }

  return { shouldEmit: true };
};
