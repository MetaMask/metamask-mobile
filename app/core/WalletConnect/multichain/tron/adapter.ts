import { TrxScope } from '@metamask/keyring-api';
import {
  type CaipAccountId,
  type CaipChainId,
  KnownCaipNamespace,
} from '@metamask/utils';
import { type Caip25CaveatValue } from '@metamask/chain-agnostic-permission';

import {
  buildAdapterScopedPermissions,
  caipAccountIdDecimalToHex,
  caipAccountIdHexToDecimal,
  caipChainIdDecimalToHex,
  caipChainIdHexToDecimal,
  doesProposalOrSessionIncludeNamespace,
  enrichCaveatValueForNamespace,
} from '../utils';
import type {
  AdapterHandleRequestArgs,
  ChainAdapter,
  NamespaceConfig,
  ProposalParamsLight,
  RpcMethod,
  RpcResponse,
} from '../types';
import { createSnapCaller } from '../router';
import {
  mapSignMessageRequest,
  mapSignMessageResponse,
  mapSignTransactionRequest,
  mapSignTransactionResponse,
} from './mapper';
import type { TronSnapSpec, TronWalletConnectSpec } from './types';

/**
 * Snap caller bound to the Tron Snap spec.
 */
const callTronSnap = createSnapCaller<TronSnapSpec>();

/**
 * WalletConnect methods the wallet exposes for the Tron namespace.
 */
const TRON_METHODS: readonly RpcMethod<TronWalletConnectSpec>[] = [
  'tron_signTransaction',
  'tron_signMessage',
];

/**
 * WalletConnect events the wallet may emit for the Tron namespace.
 */
const TRON_EVENTS: readonly string[] = [];

/**
 * CAIP-2 chain IDs (decimal Snap form) we will seed into the CAIP-25 caveat.
 *
 * The Tron Snap supports Mainnet, Nile, and Shasta, but the mobile permission
 * UI exposes only Mainnet today (Nile/Shasta are gated out of
 * `NON_EVM_CAIP_CHAIN_IDS` in `selectors/multichainNetworkController`,
 * pending a feature flag). Any testnet scope we inject would be stripped by
 * the approval UI when it rebuilds `optionalScopes` from `selectedChainIds`,
 * leaving the Tron namespace empty and breaking `approveSession`.
 *
 * Restricting to Mainnet keeps mainnet-only dapps working; testnet requests
 * fall back to Mainnet via `enrichCaveatValue`. When the feature flag lands,
 * widen this to `Object.values(TrxScope)`.
 */
const SUPPORTED_TRON_SCOPES = new Set<CaipChainId>([
  TrxScope.Mainnet as CaipChainId,
]);

/**
 * Convert an inbound CAIP-2 chain id to the Snap form (hex → decimal).
 */
export function normalizeCaipChainIdInbound(
  caipChainId: CaipChainId,
): CaipChainId {
  return caipChainIdHexToDecimal(KnownCaipNamespace.Tron, caipChainId);
}

/**
 * Convert an outbound CAIP-2 chain id to the WC form (decimal → hex).
 */
export function normalizeCaipChainIdOutbound(
  caipChainId: CaipChainId,
): CaipChainId {
  return caipChainIdDecimalToHex(KnownCaipNamespace.Tron, caipChainId);
}

/**
 * Convert an inbound CAIP-10 account id to the Snap form.
 */
export function normalizeTronAccountIdInbound(
  caipAccountId: CaipAccountId,
): CaipAccountId {
  return caipAccountIdHexToDecimal(KnownCaipNamespace.Tron, caipAccountId);
}

/**
 * Convert an outbound CAIP-10 account id to the WC form.
 */
export function normalizeTronAccountIdOutbound(
  caipAccountId: CaipAccountId,
): CaipAccountId {
  return caipAccountIdDecimalToHex(KnownCaipNamespace.Tron, caipAccountId);
}

/**
 * Build the Tron namespace slice from the wallet's current state.
 */
export async function getScopedPermissions({
  channelId,
}: {
  channelId: string;
}): Promise<NamespaceConfig | undefined> {
  return buildAdapterScopedPermissions({
    channelId,
    namespace: KnownCaipNamespace.Tron,
    methods: TRON_METHODS,
    events: TRON_EVENTS,
    normalizeChainIdOutbound: normalizeCaipChainIdOutbound,
    normalizeAccountIdOutbound: normalizeTronAccountIdOutbound,
  });
}

/**
 * Tron sessionProperties advertised to the dapp at handshake. Sets
 * `tron_method_version: 'v1'` to opt clients into the flat Reown v1
 * transaction format. Legacy clients ignore it and keep the double-wrap
 * format, which the mapper still handles.
 */
export function getSessionProperties({
  proposal,
}: {
  proposal: ProposalParamsLight;
}): Record<string, string> | undefined {
  if (
    !doesProposalOrSessionIncludeNamespace({
      proposalOrSession: proposal,
      namespace: KnownCaipNamespace.Tron,
    })
  ) {
    return undefined;
  }
  return { tron_method_version: 'v1' };
}

/**
 * Seed Tron scopes into the CAIP-25 caveat. One `optionalScope` per
 * supported Tron chain the proposal references, normalized to decimal.
 *
 * Only `SUPPORTED_TRON_SCOPES` are carried through; unsupported testnets
 * fall back to Mainnet. Widening `SUPPORTED_TRON_SCOPES` later lets this
 * function carry multi-chain requests (e.g. Mainnet + Nile) end-to-end with
 * no further change.
 */
export function enrichCaveatValue({
  proposal,
  caveatValue,
}: {
  proposal: ProposalParamsLight;
  caveatValue: Caip25CaveatValue;
}): Caip25CaveatValue {
  return enrichCaveatValueForNamespace({
    proposal,
    caveatValue,
    namespace: KnownCaipNamespace.Tron,
    supportedScopes: SUPPORTED_TRON_SCOPES,
    fallbackScope: TrxScope.Mainnet as CaipChainId,
    normalizeChainIdInbound: normalizeCaipChainIdInbound,
  });
}

/**
 * Handle a WalletConnect request for the Tron namespace by mapping it to the
 * multichain routing service, then mapping the result back to the expected
 * WalletConnect format for the dapp.
 */
export async function handleRequest({
  connectedAddresses,
  scope,
  requestId,
  method,
  params,
}: AdapterHandleRequestArgs<TronWalletConnectSpec>): Promise<
  RpcResponse<TronWalletConnectSpec>
> {
  const normalizedConnectedAddresses = connectedAddresses.map((account) =>
    normalizeTronAccountIdInbound(account),
  );

  if (method === 'tron_signMessage') {
    const result = await callTronSnap({
      connectedAddresses: normalizedConnectedAddresses,
      scope,
      requestId,
      request: mapSignMessageRequest({ params }),
    });

    return mapSignMessageResponse(result);
  }

  if (method === 'tron_signTransaction') {
    const result = await callTronSnap({
      connectedAddresses: normalizedConnectedAddresses,
      scope,
      requestId,
      request: mapSignTransactionRequest({ params }),
    });

    return mapSignTransactionResponse({ params, result });
  }

  throw new Error(`WalletConnect Tron method ${method} is not supported`);
}

/**
 * `ChainAdapter` for Tron, registered in `multichain/registry.ts` behind
 * the `tron` feature flag.
 */
export const tronAdapter: ChainAdapter<
  KnownCaipNamespace.Tron,
  TronWalletConnectSpec
> = {
  namespace: KnownCaipNamespace.Tron,
  redirectMethods: TRON_METHODS,
  approvedMethods: TRON_METHODS,
  enrichCaveatValue,
  getScopedPermissions,
  getSessionProperties,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  handleRequest,
};
