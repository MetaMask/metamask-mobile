/**
 * Per-chain adapter registry for the WalletConnect non-EVM layer.
 *
 * Each non-EVM chain registers itself here behind its feature flag.
 * To welcome a new chain (Solana, Bitcoin, ...):
 *
 * 1. Create `multichain/<chain>/index.ts` exporting a
 * `ChainAdapter` named `<chain>Adapter`.
 * 2. Import + register it inside the appropriate block below.
 *
 * That's it — no edits in `WalletConnectV2` / `WalletConnect2Session`.
 */

import type { KnownCaipNamespace } from '@metamask/utils';

import type { ChainAdapter } from './types';

///: BEGIN:ONLY_INCLUDE_IF(tron)
import { tronAdapter } from './tron';
///: END:ONLY_INCLUDE_IF

// Keyed by raw namespace string so callers can look up adapters with
// whatever namespace a dapp proposal sent (which we don't trust upfront).
const adapters = new Map<string, ChainAdapter>();

/**
 * Registers a `ChainAdapter` for a non-EVM chain, keyed by its CAIP-2 namespace.
 */
export function registerAdapter(adapter: ChainAdapter): void {
  adapters.set(adapter.namespace, adapter);
}

/**
 * Returns the registered adapter for a given CAIP-2 namespace, if any.
 */
export function getAdapter(namespace: string): ChainAdapter | undefined {
  return adapters.get(namespace);
}

/**
 * Returns every adapter currently registered, in insertion order.
 */
export function getAllAdapters(): ChainAdapter[] {
  return Array.from(adapters.values());
}

/**
 * Returns the CAIP-2 namespace of every registered adapter.
 */
export function getAllRegisteredNamespaces(): KnownCaipNamespace[] {
  return Array.from(adapters.keys()) as KnownCaipNamespace[];
}

///: BEGIN:ONLY_INCLUDE_IF(tron)
registerAdapter(tronAdapter);
///: END:ONLY_INCLUDE_IF
