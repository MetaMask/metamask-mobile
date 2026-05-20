import { TrxScope } from '@metamask/keyring-api';
import {
  type CaipAccountId,
  type CaipChainId,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipChainId,
} from '@metamask/utils';
import {
  Caip25CaveatType,
  type Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

import Engine from '../../../Engine';
import { getPermittedChains } from '../../../Permissions';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import {
  collectRequestedChainsForNamespace,
  doesProposalIncludeNamespace,
  prioritizeSelectedNonEvmCaipAccountIds,
} from '../utils';
import type {
  AdapterHandleRequestArgs,
  ChainAdapter,
  NamespaceConfig,
  ProposalParamsLight,
} from '../types';
import { callMultichainRoutingService } from '../router';
import { mapRequestInbound, mapRequestOutbound } from './mapper';
import type {
  TronSnapSignatureResult,
  TronWalletConnectMethod,
  TronWalletConnectSignMessageParams,
  TronWalletConnectSignTransactionParams,
} from './types';

/** WalletConnect methods the wallet exposes for the Tron namespace. */
const TRON_METHODS: readonly TronWalletConnectMethod[] = [
  'tron_signTransaction',
  'tron_signMessage',
];

/** WalletConnect events the wallet may emit for the Tron namespace. */
const TRON_EVENTS: readonly string[] = [];

/**
 * CAIP-2 chain IDs (decimal, Snap canonical form) we are willing to seed into
 * the CAIP-25 caveat for a WalletConnect session.
 *
 * The Tron Snap technically supports Mainnet, Nile, and Shasta (see
 * `TrxScope`), but the mobile permission flow only exposes Mainnet today:
 * `app/selectors/multichainNetworkController/index.ts` keeps Nile/Shasta out
 * of `NON_EVM_CAIP_CHAIN_IDS` pending a feature flag. Any testnet scope we
 * inject here would be stripped from the caveat by the approval UI (it
 * rebuilds `optionalScopes` from `selectedChainIds`, which is filtered against
 * `allNetworksList`), the Tron namespace would end up with no chains, and
 * `approveSession` would reject the proposal entirely.
 *
 * Restricting this set to Mainnet keeps mainnet-only dapps working and makes
 * the unsupported-testnet case fall back to Mainnet (see `enrichCaveatValue`).
 * When the testnet feature flag lands, replace this with
 * `Object.values(TrxScope)`.
 */
const SUPPORTED_TRON_SCOPES = new Set<CaipChainId>([
  TrxScope.Mainnet as CaipChainId,
]);

/**
 * Normalize a CAIP chain ID coming in from a dapp proposal or request params
 * WalletConnect use hex chain references for Tron, but the Tron Snap use decimal.
 */
export function normalizeCaipChainIdInbound(
  caipChainId: CaipChainId,
): CaipChainId {
  const { namespace, reference } = parseCaipChainId(caipChainId);

  if (namespace !== KnownCaipNamespace.Tron) {
    return caipChainId;
  }

  if (reference.startsWith('0x')) {
    return `${namespace}:${parseInt(reference, 16)}`;
  }
  return caipChainId;
}

/**
 * Normalize a CAIP chain ID going out to a dapp response
 * WalletConnect use hex chain references for Tron, but the Tron Snap use decimal.
 */
export function normalizeCaipChainIdOutbound(
  caipChainId: CaipChainId,
): CaipChainId {
  const { namespace, reference } = parseCaipChainId(caipChainId);

  if (namespace !== KnownCaipNamespace.Tron) {
    return caipChainId;
  }

  if (!reference.startsWith('0x')) {
    if (!/^\d+$/.test(reference)) {
      return caipChainId;
    }
    return `${namespace}:0x${parseInt(reference, 10).toString(16)}`;
  }
  return caipChainId;
}

/**
 * Normalize a CAIP account ID to wallet connect shape before sending it back to the dapp.
 */
export function normalizeTronAccountIdOutbound(
  caipAccountId: CaipAccountId,
): CaipAccountId {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  const normalizedCaipChainId = normalizeCaipChainIdOutbound(chainId);
  return `${normalizedCaipChainId}:${address}`;
}

/**
 * Normalize a CAIP account ID coming in from WalletConnect before sending it
 * to the Tron Snap.
 */
export function normalizeTronAccountIdInbound(
  caipAccountId: CaipAccountId,
): CaipAccountId {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  const normalizedCaipChainId = normalizeCaipChainIdInbound(chainId);
  return `${normalizedCaipChainId}:${address}`;
}

/**
 * Build this chain's namespace slice from the wallet's current state
 */
export async function getScopedPermissions({
  channelId,
}: {
  channelId: string;
}): Promise<NamespaceConfig | undefined> {
  const permittedChains = await getPermittedChains(channelId);
  const tronChains = permittedChains.filter((chain) =>
    chain.startsWith(`${KnownCaipNamespace.Tron}:`),
  );

  if (tronChains.length === 0) {
    return undefined;
  }

  let permittedTronAccounts: CaipAccountId[] = [];
  try {
    const permissionCaveat = Engine.context.PermissionController?.getCaveat(
      channelId,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
    );
    if (permissionCaveat) {
      permittedTronAccounts = getCaipAccountIdsFromCaip25CaveatValue(
        permissionCaveat.value as Parameters<
          typeof getCaipAccountIdsFromCaip25CaveatValue
        >[0],
      ).filter((account) => account.startsWith(`${KnownCaipNamespace.Tron}:`));
    }
  } catch (error) {
    if (!(error instanceof PermissionDoesNotExistError)) {
      DevLogger.log(
        '[wc][multichain/tron] failed to read permission caveat',
        error,
      );
    }
  }

  if (permittedTronAccounts.length === 0) {
    return undefined;
  }

  const sortedPermittedTronAccounts = prioritizeSelectedNonEvmCaipAccountIds(
    permittedTronAccounts,
  );

  return {
    chains: tronChains.map((chain) => normalizeCaipChainIdOutbound(chain)),
    methods: [...TRON_METHODS],
    events: [...TRON_EVENTS],
    accounts: sortedPermittedTronAccounts.map((account) =>
      normalizeTronAccountIdOutbound(account),
    ),
  };
}

/**
 * Advertise Tron-specific sessionProperties to the dapp at handshake time.
 *
 * `tron_method_version: 'v1'` opts dapps using `@tronweb3/walletconnect-tron`
 * (and compatible clients) into the flat v1 transaction format defined by the
 * Reown Tron RPC spec. Older dapps that ignore this property keep sending the
 * legacy double-wrap format, which the mapper still handles.
 */
export function getSessionProperties({
  proposal,
}: {
  proposal: ProposalParamsLight;
}): Record<string, string> | undefined {
  if (
    !doesProposalIncludeNamespace({
      proposal,
      namespace: KnownCaipNamespace.Tron,
    })
  ) {
    return undefined;
  }
  return { tron_method_version: 'v1' };
}

/**
 * Seed Tron scopes into the CAIP-25 caveat for the given WalletConnect
 * channel. Adds one optionalScope per Tron chain the dapp referenced in the
 * proposal, normalized to the Snap's decimal form.
 *
 * Only chains in `SUPPORTED_TRON_SCOPES` (Mainnet today, see its docblock)
 * are carried through; testnets requested by the dapp are dropped here and
 * the caveat falls back to Mainnet. When testnet support ships behind a
 * feature flag and `SUPPORTED_TRON_SCOPES` is widened, this function will
 * automatically carry multi-chain requests (e.g. Mainnet + Nile) end-to-end.
 */
export function enrichCaveatValue({
  proposal,
  caveatValue,
}: {
  proposal: ProposalParamsLight;
  caveatValue: Caip25CaveatValue;
}): Caip25CaveatValue {
  const requestedTronChains = collectRequestedChainsForNamespace({
    proposal,
    namespace: KnownCaipNamespace.Tron,
  });

  if (requestedTronChains.length === 0) {
    return caveatValue;
  }

  const normalizedScopes = requestedTronChains
    .map((chain) => normalizeCaipChainIdInbound(chain))
    .filter((chain) => SUPPORTED_TRON_SCOPES.has(chain));

  const scopesToAdd =
    normalizedScopes.length > 0
      ? Array.from(new Set(normalizedScopes))
      : [TrxScope.Mainnet];

  const extraOptionalScopes = Object.fromEntries(
    scopesToAdd.map((scope) => [scope, { accounts: [] }]),
  );

  return {
    ...caveatValue,
    optionalScopes: {
      ...caveatValue.optionalScopes,
      ...extraOptionalScopes,
    },
  };
}

export async function handleRequest({
  channelId,
  connectedAddresses,
  scope,
  requestId,
  method,
  params,
}: AdapterHandleRequestArgs): Promise<unknown> {
  const normalizedConnectedAddresses = connectedAddresses.map((account) =>
    normalizeTronAccountIdInbound(account),
  );
  // Throws for unsupported methods, guaranteeing `method` is a
  // `TronWalletConnectMethod` from here on.
  const mappedRequest = mapRequestInbound({ method, params });
  const result = await callMultichainRoutingService({
    channelId,
    connectedAddresses: normalizedConnectedAddresses,
    scope,
    requestId,
    mappedRequest,
  });

  return mapRequestOutbound({
    method: method as TronWalletConnectMethod,
    params: params as
      | TronWalletConnectSignMessageParams
      | TronWalletConnectSignTransactionParams,
    result: result as TronSnapSignatureResult,
  });
}

/**
 * `ChainAdapter` implementation for Tron. Registered in
 * `multichain/registry.ts` behind the `tron` feature flag.
 *
 * The adapter wraps the helper functions above so the multichain
 * dispatcher can treat Tron the same as any future non-EVM chain.
 */
export const tronAdapter: ChainAdapter = {
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
