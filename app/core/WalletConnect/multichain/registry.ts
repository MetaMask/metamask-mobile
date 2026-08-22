/**
 * Per-chain adapter registry for the WalletConnect non-EVM layer.
 *
 * To add a chain: create `multichain/<chain>/index.ts` exporting a
 * `ChainAdapter` named `<chain>Adapter`, then import and register it in the
 * feature-flag block below. No edits needed in the WC2 session classes.
 */

import type { KnownCaipNamespace } from '@metamask/utils';

import type { AnyChainAdapter } from './types';

///: BEGIN:ONLY_INCLUDE_IF(tron)
import { tronAdapter } from './tron';
///: END:ONLY_INCLUDE_IF
import { stellarAdapter } from './stellar';

// Keyed by raw namespace string so lookups accept whatever a dapp proposal
// sent, which we don't trust upfront.
const adapters = new Map<string, AnyChainAdapter>();

/**
 * Register a `ChainAdapter` under its CAIP-2 namespace.
 */
export function registerAdapter(adapter: AnyChainAdapter): void {
  adapters.set(adapter.namespace, adapter);
}

/**
 * Returns the adapter for a CAIP-2 namespace, if any.
 */
export function getAdapter(namespace: string): AnyChainAdapter | undefined {
  return adapters.get(namespace);
}

/**
 * Returns every registered adapter, in insertion order.
 */
export function getAllAdapters(): AnyChainAdapter[] {
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
registerAdapter(stellarAdapter);
