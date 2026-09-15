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
  mapSignatureResponse,
  mapSignMessageRequest,
  mapSignTransactionRequest,
  mapSignTransactionResponse,
} from './mapper';
import type { SolanaSnapSpec, SolanaWalletConnectSpec } from './types';

const callSolanaSnap = createSnapCaller<SolanaSnapSpec>();

/** WalletConnect methods the wallet exposes for the Solana namespace. */
const SOLANA_METHODS: readonly RpcMethod<SolanaWalletConnectSpec>[] = [
  'solana_getAccounts',
  'solana_requestAccounts',
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAllTransactions',
  'solana_signAndSendTransaction',
];

/** Signing methods that return the user to the dapp after handling. */
const SOLANA_REDIRECT_METHODS: readonly RpcMethod<SolanaWalletConnectSpec>[] = [
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAllTransactions',
  'solana_signAndSendTransaction',
];

const SOLANA_EVENTS: readonly string[] = ['accountsChanged'];

/** Historical WalletConnect mainnet genesis hash, normalized on the way in. */
export const SOLANA_MAINNET_LEGACY_CAIP_CHAIN_ID =
  'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ' as CaipChainId;

/**
 * Devnet/testnet are gated in the permission UI (`NON_EVM_CAIP_CHAIN_IDS`).
 * Injecting them here would be stripped on approve and leave an empty Solana
 * namespace. Unsupported requested chains fall back to Mainnet instead.
 */
const SUPPORTED_SOLANA_SCOPES = new Set<CaipChainId>([SolScope.Mainnet]);

/** Map the legacy mainnet genesis hash onto `SolScope.Mainnet`. */
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

/** Solana genesis hashes are already the CAIP-2 reference, so identity. */
export function normalizeCaipChainIdOutbound(
  caipChainId: CaipChainId,
): CaipChainId {
  return caipChainId;
}

/** Build the Solana namespace slice from the wallet's current state. */
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
 * Request `solana_accountChanged` notifications at handshake so Wallet
 * Standard-style clients stay in sync with the selected account.
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

/** Seed Solana scopes into the CAIP-25 caveat, falling back to Mainnet. */
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
 * Handle a WalletConnect Solana request by mapping it onto the multichain
 * routing service, then mapping the result back into the WalletConnect shape.
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
  const envelope = {
    origin,
    originMetadata,
    connectedAddresses,
    scope,
    requestId,
  };

  if (method === 'solana_getAccounts' || method === 'solana_requestAccounts') {
    return mapGetAccountsResponse(connectedAddresses);
  }

  if (method === 'solana_signMessage') {
    const result = await callSolanaSnap({
      ...envelope,
      request: mapSignMessageRequest({ params, connectedAddresses }),
    });

    return mapSignatureResponse(result);
  }

  if (method === 'solana_signTransaction') {
    const result = await callSolanaSnap({
      ...envelope,
      request: mapSignTransactionRequest({ params, connectedAddresses }),
    });

    return mapSignTransactionResponse(result);
  }

  if (method === 'solana_signAndSendTransaction') {
    const result = await callSolanaSnap({
      ...envelope,
      request: mapSignAndSendTransactionRequest({ params, connectedAddresses }),
    });

    return mapSignatureResponse(result);
  }

  if (method === 'solana_signAllTransactions') {
    const signedTransactions: string[] = [];

    for (const [index, transaction] of params.transactions.entries()) {
      const result = await callSolanaSnap({
        ...envelope,
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
