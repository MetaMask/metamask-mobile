/**
 * Registry of non-EVM WalletConnect chain adapters.
 * Each chain is registered exactly once here; the
 * rest of the multichain module discovers adapters through the helpers
 * below so adding a new chain is a single-line change.
 *
 * EVM (eip155) is intentionally absent — it stays in the main
 * WalletConnect code path.
 */

import type { NonEvmChainAdapter } from './types';

const adapters: NonEvmChainAdapter[] = [];

const byNamespace = new Map<string, NonEvmChainAdapter>(
  adapters.map((adapter) => [adapter.namespace, adapter]),
);

/** All registered non-EVM adapters, in registration order. */
export const getAllNonEvmAdapters = (): readonly NonEvmChainAdapter[] =>
  adapters;

/** Lookup an adapter by CAIP-2 namespace (e.g. `'tron'`). */
export const getNonEvmAdapter = (
  namespace: string,
): NonEvmChainAdapter | undefined => byNamespace.get(namespace);

/** Lookup the adapter that owns a CAIP-2 chain id (e.g. `'tron:728126428'`). */
export const getNonEvmAdapterForCaipChainId = (
  caipChainId: string,
): NonEvmChainAdapter | undefined => {
  if (typeof caipChainId !== 'string') return undefined;
  const namespace = caipChainId.split(':')[0];
  return namespace ? byNamespace.get(namespace) : undefined;
};

/** True if the given CAIP-2 chain id belongs to a registered non-EVM chain. */
export const isNonEvmCaipChainId = (caipChainId: unknown): boolean => {
  if (typeof caipChainId !== 'string') return false;
  const namespace = caipChainId.split(':')[0];
  return namespace !== undefined && byNamespace.has(namespace);
};
