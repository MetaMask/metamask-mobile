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
  doesProposalIncludeNamespace,
  prioritizeSelectedNonEvmCaipAccountIds,
} from '../utils';
import type {
  ChainAdapter,
  NamespaceConfig,
  ProposalParamsLight,
} from '../types';
import { mapRequestInbound, mapRequestOutbound } from './mapper';
import type { TronWalletConnectMethod } from './types';

/** WalletConnect methods the wallet exposes for the Tron namespace. */
const TRON_METHODS: readonly TronWalletConnectMethod[] = [
  'tron_signTransaction',
  'tron_signMessage',
];

/** WalletConnect events the wallet may emit for the Tron namespace. */
const TRON_EVENTS: readonly string[] = [];

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
 * Seed Tron accounts into the CAIP-25 caveat for the given WalletConnect
 * channel. No-op if the wallet has no Tron EOAs. Errors are swallowed and
 * logged to mirror the previous best-effort behavior.
 */
export function enrichCaveatValue({
  proposal,
  caveatValue,
}: {
  proposal: ProposalParamsLight;
  caveatValue: Caip25CaveatValue;
}): Caip25CaveatValue {
  if (
    doesProposalIncludeNamespace({
      proposal,
      namespace: KnownCaipNamespace.Tron,
    })
  ) {
    return {
      ...caveatValue,
      optionalScopes: {
        ...caveatValue.optionalScopes,
        [TrxScope.Mainnet]: { accounts: [] },
      },
    };
  }

  return caveatValue;
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
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  mapRequestInbound,
  mapRequestOutbound,
};
