/**
 * Central registry for WalletConnect chain adapters and request/response
 * mappers. Each blockchain namespace is registered once here — the rest of
 * the module discovers adapters and mappers through the exported helpers.
 */

import { KnownCaipNamespace } from '@metamask/utils';

import { eip155Adapter } from './eip155';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { tronAdapter, tronRequestMapper, tronResponseMapper } from './tron';
///: END:ONLY_INCLUDE_IF
import type {
  ChainAdapter,
  RequestMapper,
  ResponseMapper,
  SnapMappedRequest,
} from './types';

/**
 * Single registration entry for a CAIP-2 namespace. Bundles the chain
 * adapter (session config) with optional request/response mappers so every
 * chain-specific concern is declared in one place.
 */
interface ChainRegistration {
  adapter: ChainAdapter;
  requestMapper?: RequestMapper;
  responseMapper?: ResponseMapper;
}

const registrations: ChainRegistration[] = [
  { adapter: eip155Adapter },
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  {
    adapter: tronAdapter,
    requestMapper: tronRequestMapper,
    responseMapper: tronResponseMapper,
  },
  ///: END:ONLY_INCLUDE_IF
];

const byNamespace = new Map<string, ChainRegistration>(
  registrations.map((r) => [r.adapter.namespace, r]),
);

/** All registered chain adapters, in registration order. */
export const getAllAdapters = (): readonly ChainAdapter[] =>
  registrations.map((r) => r.adapter);

/** Lookup a chain adapter by CAIP-2 namespace (e.g. `'eip155'`). */
export const getAdapter = (namespace: string): ChainAdapter | undefined =>
  byNamespace.get(namespace)?.adapter;

/**
 * Lookup the adapter that owns a JSON-RPC method (non-EVM only — EIP155
 * methods are dispatched via BackgroundBridge, not through an adapter).
 */
export const getAdapterForMethod = (
  method: string,
): ChainAdapter | undefined => {
  for (const { adapter } of registrations) {
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

/**
 * Normalize a CAIP-2 chain ID received from WalletConnect by delegating to
 * the adapter that owns the namespace. Returns the input unchanged when no
 * adapter provides a normalizer.
 */
export const normalizeCaipChainId = (caipChainId: string): string => {
  const namespace = caipChainId.split(':')[0];
  const adapter = namespace ? getAdapter(namespace) : undefined;
  return adapter?.normalizeCaipChainId
    ? adapter.normalizeCaipChainId(caipChainId)
    : caipChainId;
};

/**
 * Map a raw WalletConnect request into the shape expected by the Snap for
 * the given namespace. Returns the request unchanged if no mapper is
 * registered for the namespace.
 *
 * @param namespace - The CAIP-2 namespace (e.g. `'tron'`).
 * @param request - The raw WalletConnect method and params.
 * @returns The mapped method and params for the Snap.
 */
export const mapRequest = (
  namespace: string,
  request: SnapMappedRequest,
): SnapMappedRequest => {
  const mapper = byNamespace.get(namespace)?.requestMapper;
  return mapper ? mapper(request) : request;
};

/**
 * Post-process a Snap result before the wallet responds to the dapp for the
 * given namespace. Returns the result unchanged if no mapper is registered.
 *
 * @param namespace - The CAIP-2 namespace (e.g. `'tron'`).
 * @param params - The original WalletConnect method, params, and Snap result.
 * @returns The response to send back to the dapp via WalletConnect.
 */
export const mapResponse = (
  namespace: string,
  params: { method: string; params: unknown; result: unknown },
): unknown => {
  const mapper = byNamespace.get(namespace)?.responseMapper;
  return mapper ? mapper(params) : params.result;
};
