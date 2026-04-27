/**
 * Tron chain adapter for the non-EVM WalletConnect registry.
 *
 * Owns the declarative session config, the namespace builder, the
 * permission seeding, and the request/response shape mappers. Wired into
 * the registry via `multichain/registry.ts` behind the `tron` feature flag.
 */

import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { TrxAccountType, TrxScope } from '@metamask/keyring-api';
import { KnownCaipNamespace, type CaipAccountId } from '@metamask/utils';

import Engine from '../../../Engine';
import { addPermittedAccounts } from '../../../Permissions';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

import type {
  NonEvmChainAdapter,
  NamespaceConfig,
  ProposalLike,
} from '../types';
import { tronRequestMapper, tronResponseMapper } from './request-mapper';

const TRON_METHODS: string[] = ['tron_signTransaction', 'tron_signMessage'];
// Declared so the dapp's WC SDK accepts our `emitSessionEvent('accountsChanged', …)`
// pushed after `reorderNonEvmAccounts`. Without this, dapps watching for an
// account switch only see it through `session_update`, not as an event.
const TRON_EVENTS: string[] = ['accountsChanged'];
const TRON_REDIRECT_METHODS: string[] = [
  'tron_signTransaction',
  'tron_signMessage',
];

const TRON_PREFIX = `${KnownCaipNamespace.Tron}:` as const;
const FALLBACK_TRON_CHAIN = TrxScope.Mainnet;

const isTronChain = (caipChainId: string): boolean =>
  caipChainId.startsWith(TRON_PREFIX);

const listTronEoaAddresses = (): string[] => {
  try {
    return Engine.context.AccountsController.listAccounts()
      .filter((account) => account.type === TrxAccountType.Eoa)
      .map((account) => account.address);
  } catch (err) {
    DevLogger.log('[wc][tron] listTronEoaAddresses failed', err);
    return [];
  }
};

const getRequestedTronChainIds = (proposal: ProposalLike): string[] => {
  const required = proposal.requiredNamespaces;
  const optional = proposal.optionalNamespaces;
  const requestedInRequired = required?.[KnownCaipNamespace.Tron]?.chains ?? [];
  const requestedInOptional = optional?.[KnownCaipNamespace.Tron]?.chains ?? [];
  const bareTronChains = [
    ...Object.values(required ?? {}).flatMap((ns) => ns?.chains ?? []),
    ...Object.values(optional ?? {}).flatMap((ns) => ns?.chains ?? []),
  ].filter(isTronChain);
  return Array.from(
    new Set([
      ...requestedInRequired,
      ...requestedInOptional,
      ...bareTronChains,
    ]),
  );
};

const getPermittedTronAccountsFromCaveat = (
  channelId: string,
): CaipAccountId[] => {
  const caveat = Engine.context.PermissionController?.getCaveat?.(
    channelId,
    Caip25EndowmentPermissionName,
    Caip25CaveatType,
  );
  if (!caveat) return [];
  return getCaipAccountIdsFromCaip25CaveatValue(
    caveat.value as Caip25CaveatValue,
  ).filter(isTronChain) as CaipAccountId[];
};

export const tronAdapter: NonEvmChainAdapter = {
  namespace: KnownCaipNamespace.Tron,
  redirectMethods: TRON_REDIRECT_METHODS,

  /**
   * Some dapps send `tron:0x2b6653dc` instead of `tron:728126428`. The
   * Snap-routing service expects the decimal form, so normalize here.
   */
  normalizeCaipChainId(caipChainId) {
    const ref = caipChainId.slice(TRON_PREFIX.length);
    if (ref.startsWith('0x')) {
      return `${TRON_PREFIX}${parseInt(ref, 16)}`;
    }
    return caipChainId;
  },

  /**
   * Seed Tron EOAs into the CAIP-25 caveat for this WalletConnect channel
   * before the session is approved, so `buildNamespaceSlice` can read them
   * back from the caveat below.
   */
  onBeforeApprove({ channelId }) {
    const tronAddresses = listTronEoaAddresses();
    if (tronAddresses.length === 0) return;
    try {
      const tronCaipAccountIds = tronAddresses.map(
        (address) => `${FALLBACK_TRON_CHAIN}:${address}` as CaipAccountId,
      );
      addPermittedAccounts(channelId, tronCaipAccountIds);
    } catch (err) {
      DevLogger.log('[wc][tron] addPermittedAccounts failed', err);
    }
  },

  /**
   * Echo back exactly the CAIP chain IDs the dapp requested (some dapp
   * Tron adapters crash on mismatches). Falls back to mainnet when no
   * chains are requested. Returns `undefined` when neither chains nor
   * accounts are available.
   */
  buildNamespaceSlice({ proposal, channelId }): NamespaceConfig | undefined {
    const requestedChains = getRequestedTronChainIds(proposal);
    const hasTronRequest = requestedChains.length > 0;
    const tronChains = hasTronRequest
      ? Array.from(new Set(requestedChains))
      : [FALLBACK_TRON_CHAIN as string];

    const permittedAccounts = getPermittedTronAccountsFromCaveat(channelId);
    const permittedAddresses = Array.from(
      new Set(
        permittedAccounts
          .map((account) => account.split(':').slice(2).join(':'))
          .filter(Boolean),
      ),
    );

    const fallbackAddresses =
      permittedAddresses.length > 0 ? [] : listTronEoaAddresses();

    const addresses = Array.from(
      new Set([...permittedAddresses, ...fallbackAddresses]),
    );

    // WalletConnect rejects `approveSession` for namespaces with empty
    // `accounts`. Skip the slice entirely when we have nothing to expose,
    // even if the dapp explicitly requested Tron — better to silently drop
    // the namespace than fail the whole pairing.
    if (addresses.length === 0) {
      return undefined;
    }

    const accounts = addresses.flatMap((address) =>
      tronChains.map((chain) => `${chain}:${address}`),
    );

    return {
      chains: tronChains,
      methods: TRON_METHODS,
      events: TRON_EVENTS,
      accounts,
    };
  },

  mapRequest: tronRequestMapper,
  mapResponse: tronResponseMapper,
};
