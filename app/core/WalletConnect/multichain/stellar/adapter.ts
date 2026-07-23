import { XlmScope } from '@metamask/keyring-api';
import { type CaipChainId, KnownCaipNamespace } from '@metamask/utils';
import { type Caip25CaveatValue } from '@metamask/chain-agnostic-permission';

import {
  buildAdapterScopedPermissions,
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
  mapSignTransactionRequest,
  mapSignTransactionResponse,
} from './mapper';
import type { StellarSnapSpec, StellarWalletConnectSpec } from './types';

/**
 * Snap caller bound to the Stellar Snap spec.
 */
const callStellarSnap = createSnapCaller<StellarSnapSpec>();

/**
 * WalletConnect methods the wallet exposes for the Stellar namespace.
 *
 * Only `stellar_signXDR` is exposed; `stellar_signAndSubmitXDR` is omitted
 * because the Stellar Snap is sign-only and cannot broadcast transactions.
 */
const STELLAR_METHODS: readonly RpcMethod<StellarWalletConnectSpec>[] = [
  'stellar_signXDR',
];

/**
 * WalletConnect Stellar methods that should redirect users back to the dapp
 * after handling.
 */
const STELLAR_REDIRECT_METHODS: readonly RpcMethod<StellarWalletConnectSpec>[] =
  ['stellar_signXDR'];

/**
 * WalletConnect events the wallet may emit for the Stellar namespace.
 */
const STELLAR_EVENTS: readonly string[] = [];

/**
 * CAIP-2 chain IDs we will seed into the CAIP-25 caveat.
 *
 * Restricted to Mainnet (pubnet) because the Stellar Snap only supports
 * mainnet. Unlike Solana and Tron — whose testnets are merely gated out of
 * the mobile permission UI pending a feature flag — this is not a permission
 * concern: the snap itself has no testnet support. There is therefore no
 * scope to widen later and no chain switching to handle, since Stellar
 * exposes a single network.
 */
const SUPPORTED_STELLAR_SCOPES = new Set<CaipChainId>([
  XlmScope.Pubnet as CaipChainId,
]);

/**
 * Build the Stellar namespace slice from the wallet's current state.
 */
export async function getScopedPermissions({
  channelId,
}: {
  channelId: string;
}): Promise<NamespaceConfig | undefined> {
  return buildAdapterScopedPermissions({
    channelId,
    namespace: KnownCaipNamespace.Stellar,
    methods: STELLAR_METHODS,
    events: STELLAR_EVENTS,
  });
}

/**
 * Seed the Stellar scope into the CAIP-25 caveat. Stellar exposes a single
 * supported network (Mainnet/pubnet), so any unsupported requested scope
 * falls back to it.
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
    namespace: KnownCaipNamespace.Stellar,
    supportedScopes: SUPPORTED_STELLAR_SCOPES,
    fallbackScope: XlmScope.Pubnet as CaipChainId,
  });
}

/**
 * Handle a WalletConnect request for the Stellar namespace by mapping it to
 * the multichain routing service, then mapping the result back to the
 * expected WalletConnect format for the dapp.
 */
export async function handleRequest({
  connectedAddresses,
  scope,
  requestId,
  method,
  params,
}: AdapterHandleRequestArgs<StellarWalletConnectSpec>): Promise<
  RpcResponse<StellarWalletConnectSpec>
> {
  if (method === 'stellar_signXDR') {
    const result = await callStellarSnap({
      connectedAddresses,
      scope,
      requestId,
      request: mapSignTransactionRequest({ params }),
    });

    return mapSignTransactionResponse(result);
  }

  throw new Error(
    `WalletConnect Stellar method ${String(method)} is not supported`,
  );
}

/**
 * `ChainAdapter` for Stellar, registered in `multichain/registry.ts`.
 */
export const stellarAdapter: ChainAdapter<
  KnownCaipNamespace.Stellar,
  StellarWalletConnectSpec
> = {
  namespace: KnownCaipNamespace.Stellar,
  redirectMethods: STELLAR_REDIRECT_METHODS,
  approvedMethods: STELLAR_METHODS,
  enrichCaveatValue,
  getScopedPermissions,
  handleRequest,
};
