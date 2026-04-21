import { KnownCaipNamespace } from '@metamask/utils';

import { eip155Adapter } from './eip155';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { tronAdapter } from './tron';
///: END:ONLY_INCLUDE_IF
import type { ChainAdapter } from './types';

const adapters: ChainAdapter[] = [
  eip155Adapter,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  tronAdapter,
  ///: END:ONLY_INCLUDE_IF
];

const byNamespace = new Map<string, ChainAdapter>(
  adapters.map((adapter) => [adapter.namespace, adapter]),
);

/** All registered chain adapters, in registration order. */
export const getAllAdapters = (): readonly ChainAdapter[] => adapters;

/** Lookup a chain adapter by CAIP-2 namespace (e.g. `'eip155'`). */
export const getAdapter = (namespace: string): ChainAdapter | undefined =>
  byNamespace.get(namespace);

/**
 * Lookup the adapter that owns a JSON-RPC method (non-EVM only — EIP155
 * methods are dispatched via BackgroundBridge, not through an adapter).
 */
export const getAdapterForMethod = (
  method: string,
): ChainAdapter | undefined => {
  for (const adapter of adapters) {
    // EIP155 is routed through BackgroundBridge, not Snap adapters.
    if (adapter.namespace === KnownCaipNamespace.Eip155) {
      continue;
    }
    if (adapter.methods.includes(method)) {
      return adapter;
    }
  }
  return undefined;
};

/**
 * Lookup the adapter for a CAIP-2 chain id (e.g. `'tron:0x2b6653dc'`).
 */
export const getAdapterForCaipChainId = (
  caipChainId: string,
): ChainAdapter | undefined => {
  const namespace = caipChainId.split(':')[0];
  return namespace ? getAdapter(namespace) : undefined;
};
