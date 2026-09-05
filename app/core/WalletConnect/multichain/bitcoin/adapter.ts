import { BtcScope } from '@metamask/keyring-api';
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
  mapAccountAddressesRequest,
  mapSendTransferRequest,
  mapSendTransferResponse,
  mapSignMessageRequest,
  mapSignMessageResponse,
  mapSignPsbtRequest,
  mapSignPsbtResponse,
} from './mapper';
import type { BitcoinSnapSpec, BitcoinWalletConnectSpec } from './types';

/**
 * Snap caller bound to the Bitcoin Snap spec.
 */
const callBitcoinSnap = createSnapCaller<BitcoinSnapSpec>();

/**
 * WalletConnect methods the wallet exposes for the Bitcoin namespace.
 */
const BITCOIN_METHODS: readonly RpcMethod<BitcoinWalletConnectSpec>[] = [
  'bitcoin_getAccountAddresses',
  'bitcoin_signMessage',
  'bitcoin_signPsbt',
  'bitcoin_sendTransfer',
];

/**
 * WalletConnect Bitcoin methods that should redirect users back to the dapp
 * after handling. The read-only address method intentionally stays out.
 */
const BITCOIN_REDIRECT_METHODS: readonly RpcMethod<BitcoinWalletConnectSpec>[] =
  ['bitcoin_signMessage', 'bitcoin_signPsbt', 'bitcoin_sendTransfer'];

/**
 * WalletConnect events the wallet may emit for the Bitcoin namespace.
 */
const BITCOIN_EVENTS: readonly string[] = [];

/**
 * CAIP-2 chain IDs we will seed into the CAIP-25 caveat.
 *
 * The Bitcoin Snap supports Mainnet, Testnet, Signet, and Regtest, but the
 * mobile permission UI exposes only Mainnet today (testnets are gated out of
 * `NON_EVM_CAIP_CHAIN_IDS` in `selectors/multichainNetworkController`, pending
 * a feature flag). Any testnet scope we inject would be stripped by the
 * approval UI when it rebuilds `optionalScopes` from `selectedChainIds`,
 * leaving the Bitcoin namespace empty and breaking `approveSession`.
 *
 * Restricting to Mainnet keeps mainnet-only dapps working; testnet requests
 * fall back to Mainnet via `enrichCaveatValue`. When the feature flag lands,
 * widen this to `Object.values(BtcScope)`.
 */
const SUPPORTED_BITCOIN_SCOPES = new Set<CaipChainId>([
  BtcScope.Mainnet as CaipChainId,
]);

/**
 * Build the Bitcoin namespace slice from the wallet's current state.
 */
export async function getScopedPermissions({
  channelId,
}: {
  channelId: string;
}): Promise<NamespaceConfig | undefined> {
  return buildAdapterScopedPermissions({
    channelId,
    namespace: KnownCaipNamespace.Bip122,
    methods: BITCOIN_METHODS,
    events: BITCOIN_EVENTS,
  });
}

/**
 * Seed Bitcoin scopes into the CAIP-25 caveat. One `optionalScope` per
 * supported Bitcoin chain the proposal references.
 *
 * Only `SUPPORTED_BITCOIN_SCOPES` are carried through; unsupported testnets
 * fall back to Mainnet. Widening `SUPPORTED_BITCOIN_SCOPES` later lets this
 * function carry multi-chain requests end-to-end with no further change.
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
    namespace: KnownCaipNamespace.Bip122,
    supportedScopes: SUPPORTED_BITCOIN_SCOPES,
    fallbackScope: BtcScope.Mainnet as CaipChainId,
  });
}

/**
 * Handle a WalletConnect request for the Bitcoin namespace by mapping it to
 * the multichain routing service, then mapping the result back to the
 * expected WalletConnect format for the dapp.
 */
export async function handleRequest({
  connectedAddresses,
  scope,
  requestId,
  method,
  params,
}: AdapterHandleRequestArgs<BitcoinWalletConnectSpec>): Promise<
  RpcResponse<BitcoinWalletConnectSpec>
> {
  if (method === 'bitcoin_getAccountAddresses') {
    return mapAccountAddressesRequest({ connectedAddresses });
  }

  if (method === 'bitcoin_signMessage') {
    const result = await callBitcoinSnap({
      connectedAddresses,
      scope,
      requestId,
      request: mapSignMessageRequest({ params }),
    });

    return mapSignMessageResponse({ connectedAddresses, result });
  }

  if (method === 'bitcoin_signPsbt') {
    const result = await callBitcoinSnap({
      connectedAddresses,
      scope,
      requestId,
      request: mapSignPsbtRequest({ params }),
    });

    return mapSignPsbtResponse(result);
  }

  if (method === 'bitcoin_sendTransfer') {
    const result = await callBitcoinSnap({
      connectedAddresses,
      scope,
      requestId,
      request: mapSendTransferRequest({ params }),
    });

    return mapSendTransferResponse(result);
  }

  throw new Error(
    `WalletConnect Bitcoin method ${String(method)} is not supported`,
  );
}

/**
 * `ChainAdapter` for Bitcoin, registered in `multichain/registry.ts`.
 */
export const bitcoinAdapter: ChainAdapter<
  KnownCaipNamespace.Bip122,
  BitcoinWalletConnectSpec
> = {
  namespace: KnownCaipNamespace.Bip122,
  redirectMethods: BITCOIN_REDIRECT_METHODS,
  approvedMethods: BITCOIN_METHODS,
  enrichCaveatValue,
  getScopedPermissions,
  handleRequest,
};
