/**
 * Per-chain adapter registry for the WalletConnect non-EVM layer.
 *
 * Each non-EVM chain registers itself here behind its feature flag.
 * To welcome a new chain (Solana, Bitcoin, ...):
 *
 * 1. Create `multichain/<chain>/index.ts` exporting a
 * `ChainAdapter` named `<chain>Adapter`.
 * 2. Import + register it inside the appropriate
 * `///: BEGIN:ONLY_INCLUDE_IF(<flag>)` block below.
 *
 * That's it — no edits in `WalletConnectV2` / `WalletConnect2Session`.
 */

import type { ChainAdapter } from './types';

///: BEGIN:ONLY_INCLUDE_IF(tron)
import { tronAdapter } from './tron';
///: END:ONLY_INCLUDE_IF

const adapters = new Map<string, ChainAdapter>();

const registerAdapter = (adapter: ChainAdapter): void => {
  adapters.set(adapter.namespace, adapter);
};

///: BEGIN:ONLY_INCLUDE_IF(tron)
registerAdapter(tronAdapter);
///: END:ONLY_INCLUDE_IF

/** Returns the registered adapter for a given CAIP-2 namespace, if any. */
export const getAdapter = (namespace: string): ChainAdapter | undefined =>
  adapters.get(namespace);

/** Returns every adapter currently registered, in insertion order. */
export const getAllAdapters = (): ChainAdapter[] =>
  Array.from(adapters.values());

/** Returns the CAIP-2 namespace of every registered adapter. */
export const getAllRegisteredNamespaces = (): string[] =>
  Array.from(adapters.keys());
