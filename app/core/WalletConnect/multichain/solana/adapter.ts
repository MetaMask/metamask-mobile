import { SolScope } from '@metamask/keyring-api';
import {
  type CaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import { type Caip25CaveatValue } from '@metamask/chain-agnostic-permission';

import {
  buildAdapterScopedPermissions,
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
  extractSignedTransaction,
  mapGetAccountsResponse,
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
 * Signing methods that should return the user to the dapp after handling.
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
const SOLANA_EVENTS: readonly string[] = ['accountsChanged'];

/**
 * Historical WalletConnect mainnet genesis hash. Normalize inbound to
 * `SolScope.Mainnet` so permissions and the snap use the current CAIP-2 id.
 */
export const SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID =
  'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ' as CaipChainId;

/**
 * CAIP-2 chain IDs we seed into the CAIP-25 caveat.
 *
 * Devnet/testnet are gated in the permission UI
 * (`NON_EVM_CAIP_CHAIN_IDS`). Injecting them here would be stripped on
 * approve and leave an empty Solana namespace. Unsupported requested
 * chains fall back to Mainnet via `enrichCaveatValue`.
 */
const SUPPORTED_SOLANA_SCOPES = new Set<CaipChainId>([SolScope.Mainnet]);

/**
 * Convert an inbound CAIP-2 chain id to the Snap form. Maps the legacy
 * WalletConnect mainnet genesis hash onto `SolScope.Mainnet`.
 */
export function normalizeCaipChainIdInbound(
  caipChainId: CaipChainId,
): CaipChainId {
  const { namespace } = parseCaipChainId(caipChainId);
  if (namespace !== KnownCaipNamespace.Solana) {
    return caipChainId;
  }
  if (caipChainId === SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID) {
    return SolScope.Mainnet as CaipChainId;
  }
  return caipChainId;
}

/**
 * Convert an outbound CAIP-2 chain id to the WC form. Solana genesis hashes
 * are already the CAIP-2 reference, so this is identity.
 */
export function normalizeCaipChainIdOutbound(
  caipChainId: CaipChainId,
): CaipChainId {
  return caipChainId;
}

/**
 * Build the Solana namespace slice from the wallet's current state.
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
    normalizeChainIdOutbound: normalizeCaipChainIdOutbound,
  });
}

/**
 * Solana sessionProperties advertised to the dapp at handshake. Requests
 * `solana_accountChanged` notifications so Wallet Standard-style clients can
 * stay in sync with the selected account.
 */
export function getSessionProperties({
  proposal,
}: {
  proposal: ProposalParamsLight;
}): Record<string, string> | undefined {
  if (
    !doesProposalOrSessionIncludeNamespace({
      proposalOrSession: proposal,
      namespace: KnownCaipNamespace.Solana,
    })
  ) {
    return undefined;
  }
  return { solana_accountChanged_notifications: 'true' };
}

/**
 * Seed Solana scopes into the CAIP-25 caveat. Unsupported requested chains
 * fall back to Mainnet.
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
    normalizeChainIdInbound: normalizeCaipChainIdInbound,
  });
}

/**
 * Handle a WalletConnect request for the Solana namespace by mapping it to the
 * multichain routing service, then mapping the result back to the expected
 * WalletConnect format for the dapp.
 */
export async function handleRequest({
  origin,
  originMetadata,
  connectedAddresses,
  scope,
  requestId,
  method,
  params,
}: AdapterHandleRequestArgs<SolanaWalletConnectSpec>): Promise<
  RpcResponse<SolanaWalletConnectSpec>
> {
  if (method === 'solana_getAccounts' || method === 'solana_requestAccounts') {
    return mapGetAccountsResponse(connectedAddresses);
  }

  if (method === 'solana_signMessage') {
    const result = await callSolanaSnap({
      origin,
      originMetadata,
      connectedAddresses,
      scope,
      requestId,
      request: mapSignMessageRequest({ params, connectedAddresses }),
    });

    return mapSignMessageResponse(result);
  }

  if (method === 'solana_signTransaction') {
    const result = await callSolanaSnap({
      origin,
      originMetadata,
      connectedAddresses,
      scope,
      requestId,
      request: mapSignTransactionRequest({ params, connectedAddresses }),
    });

    return mapSignTransactionResponse(result);
  }

  if (method === 'solana_signAndSendTransaction') {
    const result = await callSolanaSnap({
      origin,
      originMetadata,
      connectedAddresses,
      scope,
      requestId,
      request: mapSignAndSendTransactionRequest({
        params,
        connectedAddresses,
      }),
    });

    return mapSignAndSendTransactionResponse(result);
  }

  if (method === 'solana_signAllTransactions') {
    const signedTransactions: string[] = [];

    for (const [index, transaction] of params.transactions.entries()) {
      const result = await callSolanaSnap({
        origin,
        originMetadata,
        connectedAddresses,
        scope,
        requestId: requestId + index,
        request: mapSignTransactionRequest({
          params: { transaction },
          connectedAddresses,
        }),
      });
      signedTransactions.push(extractSignedTransaction(result));
    }

    return { transactions: signedTransactions };
  }

  throw new Error(`WalletConnect Solana method ${method} is not supported`);
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
  getSessionProperties,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  handleRequest,
};
