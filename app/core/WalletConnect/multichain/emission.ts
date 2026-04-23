import { KnownCaipNamespace } from '@metamask/utils';

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
 * payload it should carry. Prefers non-EVM namespaces (they tend to be
 * chain-specific dapps that also crashed during our Tron debugging), falling
 * back to the first EIP155 chain, falling back to the EVM wallet state.
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
  const entries = Object.entries(namespaces ?? {});

  for (const [key, config] of entries) {
    if (
      key === KnownCaipNamespace.Eip155 ||
      key === KnownCaipNamespace.Wallet
    ) {
      continue;
    }
    const first = config?.chains?.[0];
    if (first) {
      return { chainId: first, data: first };
    }
  }

  const eip155Chain = namespaces?.[KnownCaipNamespace.Eip155]?.chains?.[0];
  if (eip155Chain) {
    return { chainId: eip155Chain, data: fallbackEvmHex };
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
