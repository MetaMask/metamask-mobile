import { SolScope } from '@metamask/keyring-api';
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
  mapAccountRequest,
  mapSignAndSendTransactionRequest,
  mapSignAndSendTransactionResponse,
  mapSignMessageRequest,
  mapSignMessageResponse,
  mapSignTransactionRequest,
  mapSignTransactionResponse,
} from './mapper';
import type { SolanaSnapSpec, SolanaWalletConnectSpec } from './types';

/**
 * Snap caller bound to the Solana Snap spec.
 */
const callSolanaSnap = createSnapCaller<SolanaSnapSpec>();

/**
 * WalletConnect methods the wallet exposes for the Solana namespace.
 */
const SOLANA_METHODS: readonly RpcMethod<SolanaWalletConnectSpec>[] = [
  'solana_getAccounts',
  'solana_requestAccounts',
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAllTransactions',
  'solana_signAndSendTransaction',
];

/**
 * WalletConnect Solana methods that should redirect users back to the dapp
 * after handling. Read-only account methods intentionally stay out.
 */
const SOLANA_REDIRECT_METHODS: readonly RpcMethod<SolanaWalletConnectSpec>[] = [
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAllTransactions',
  'solana_signAndSendTransaction',
];

/**
 * WalletConnect events the wallet may emit for the Solana namespace.
 */
const SOLANA_EVENTS: readonly string[] = [];

/**
 * CAIP-2 chain IDs we will seed into the CAIP-25 caveat.
 *
 * The Solana Snap supports Mainnet, Testnet, and Devnet, but the mobile
 * permission UI exposes only Mainnet today (Testnet/Devnet are gated out of
 * `NON_EVM_CAIP_CHAIN_IDS` in `selectors/multichainNetworkController`,
 * pending a feature flag). Any testnet scope we inject would be stripped by
 * the approval UI when it rebuilds `optionalScopes` from `selectedChainIds`,
 * leaving the Solana namespace empty and breaking `approveSession`.
 *
 * Restricting to Mainnet keeps mainnet-only dapps working; testnet requests
 * fall back to Mainnet via `enrichCaveatValue`. When the feature flag lands,
 * widen this to `Object.values(SolScope)`.
 */
const SUPPORTED_SOLANA_SCOPES = new Set<CaipChainId>([
  SolScope.Mainnet as CaipChainId,
]);

/**
 * Build the Solana namespace slice from the wallet's current state.
 *
 * Account changes are handled here by rebuilding the namespace accounts with
 * the currently selected MetaMask Mobile account first. The current
 * `@walletconnect/solana-adapter` dapp package receives that `session_update`,
 * but does not update its cached `publicKey` from the reordered account list.
 */
export async function getScopedPermissions({
  channelId,
}: {
  channelId: string;
}): Promise<NamespaceConfig | undefined> {
  return buildAdapterScopedPermissions({
    channelId,
    namespace: KnownCaipNamespace.Solana,
    methods: SOLANA_METHODS,
    events: SOLANA_EVENTS,
  });
}

/**
 * Seed Solana scopes into the CAIP-25 caveat. One `optionalScope` per
 * supported Solana chain the proposal references.
 *
 * Only `SUPPORTED_SOLANA_SCOPES` are carried through; unsupported testnets
 * fall back to Mainnet. Widening `SUPPORTED_SOLANA_SCOPES` later lets this
 * function carry multi-chain requests (e.g. Mainnet + Devnet) end-to-end with
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
    namespace: KnownCaipNamespace.Solana,
    supportedScopes: SUPPORTED_SOLANA_SCOPES,
    fallbackScope: SolScope.Mainnet as CaipChainId,
  });
}

/**
 * Handle a WalletConnect request for the Solana namespace by mapping it to the
 * multichain routing service, then mapping the result back to the expected
 * WalletConnect format for the dapp
 */
export async function handleRequest({
  origin,
  connectedAddresses,
  scope,
  requestId,
  method,
  params,
}: AdapterHandleRequestArgs<SolanaWalletConnectSpec>): Promise<
  RpcResponse<SolanaWalletConnectSpec>
> {
  if (method === 'solana_getAccounts' || method === 'solana_requestAccounts') {
    return mapAccountRequest({ connectedAddresses });
  }

  if (method === 'solana_signAllTransactions') {
    const transactions = params.transactions ?? [];

    const results: SolanaWalletConnectSpec['solana_signAllTransactions']['response']['transactions'] =
      [];

    for (const transaction of transactions) {
      const result = await callSolanaSnap({
        origin,
        connectedAddresses,
        scope,
        requestId,
        request: mapSignTransactionRequest({
          params: { transaction },
          scope,
          connectedAddresses,
        }),
      });

      results.push(result.signedTransaction);
    }

    return { transactions: results };
  }

  if (method === 'solana_signMessage') {
    const result = await callSolanaSnap({
      origin,
      connectedAddresses,
      scope,
      requestId,
      request: mapSignMessageRequest({
        params,
      }),
    });

    return mapSignMessageResponse(result);
  }

  if (method === 'solana_signTransaction') {
    const result = await callSolanaSnap({
      origin,
      connectedAddresses,
      scope,
      requestId,
      request: mapSignTransactionRequest({
        params,
        scope,
        connectedAddresses,
      }),
    });

    return mapSignTransactionResponse(result);
  }

  if (method === 'solana_signAndSendTransaction') {
    const result = await callSolanaSnap({
      origin,
      connectedAddresses,
      scope,
      requestId,
      request: mapSignAndSendTransactionRequest({
        params,
        scope,
        connectedAddresses,
      }),
    });

    return mapSignAndSendTransactionResponse(result);
  }

  throw new Error(
    `WalletConnect Solana method ${String(method)} is not supported`,
  );
}

/**
 * `ChainAdapter` for Solana, registered in `multichain/registry.ts` behind
 * the `solana` feature flag.
 */
export const solanaAdapter: ChainAdapter<
  KnownCaipNamespace.Solana,
  SolanaWalletConnectSpec
> = {
  namespace: KnownCaipNamespace.Solana,
  redirectMethods: SOLANA_REDIRECT_METHODS,
  approvedMethods: SOLANA_METHODS,
  enrichCaveatValue,
  getScopedPermissions,
  handleRequest,
};
