/**
 * Tron chain adapter for WalletConnect.
 *
 * Owns the declarative session configuration (methods, events, redirect
 * methods) and the permission / namespace-building logic needed during
 * session proposal approval. Request mapping lives in `./request-mapper.ts`.
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
import type { ChainAdapter, NamespaceConfig, ProposalLike } from '../types';

/** WalletConnect methods the wallet exposes for the Tron namespace. */
const METHODS: string[] = ['tron_signTransaction', 'tron_signMessage'];

/** WalletConnect events the wallet may emit for the Tron namespace. */
const EVENTS: string[] = [];

/** Methods that should redirect the user back to the dapp after confirmation. */
const REDIRECT_METHODS: string[] = ['tron_signTransaction', 'tron_signMessage'];

/** CAIP-2 prefix for Tron chain IDs. */
const TRON_PREFIX = `${KnownCaipNamespace.Tron}:` as const;

/** Default Tron chain used when the dapp doesn't specify one. */
const FALLBACK_TRON_CHAIN = TrxScope.Mainnet;

/**
 * List all Tron EOA addresses currently managed by the wallet.
 *
 * @returns An array of base58-encoded Tron addresses.
 */
const listTronEoaAddresses = (): string[] => {
  try {
    return Engine.context.AccountsController.listAccounts()
      .filter(
        (account: { type: string }) => account.type === TrxAccountType.Eoa,
      )
      .map((account: { address: string }) => account.address);
  } catch (err) {
    DevLogger.log('[wc][tron] listTronEoaAddresses failed', err);
    return [];
  }
};

/**
 * Collect every Tron CAIP-2 chain ID requested by the dapp proposal.
 * Checks both `requiredNamespaces` and `optionalNamespaces`, including
 * bare chain references that start with the `tron:` prefix.
 *
 * @param proposal - The WalletConnect session proposal.
 * @returns Deduplicated array of requested Tron chain IDs.
 */
const getRequestedTronChainIds = (proposal: ProposalLike): string[] => {
  const requestedInRequired =
    proposal.requiredNamespaces?.[KnownCaipNamespace.Tron]?.chains ?? [];
  const requestedInOptional =
    proposal.optionalNamespaces?.[KnownCaipNamespace.Tron]?.chains ?? [];
  const bareTronChains = [
    ...Object.values(proposal.requiredNamespaces ?? {}).flatMap(
      (ns) => ns?.chains ?? [],
    ),
    ...Object.values(proposal.optionalNamespaces ?? {}).flatMap(
      (ns) => ns?.chains ?? [],
    ),
  ].filter((chain) => chain.startsWith(TRON_PREFIX));

  return Array.from(
    new Set([
      ...requestedInRequired,
      ...requestedInOptional,
      ...bareTronChains,
    ]),
  );
};

/**
 * Read Tron accounts already permitted for this WalletConnect channel from
 * the CAIP-25 caveat stored in the PermissionController.
 *
 * @param channelId - The WalletConnect channel / pairing topic ID.
 * @returns Array of CAIP-10 Tron account IDs.
 */
const getPermittedTronAccountsFromCaveat = (
  channelId: string,
): CaipAccountId[] => {
  const caveat = Engine.context.PermissionController?.getCaveat?.(
    channelId,
    Caip25EndowmentPermissionName,
    Caip25CaveatType,
  );
  if (!caveat) {
    return [];
  }

  return getCaipAccountIdsFromCaip25CaveatValue(
    caveat.value as Caip25CaveatValue,
  ).filter((account) => account.startsWith(TRON_PREFIX)) as CaipAccountId[];
};

/**
 * Tron adapter for WalletConnect multichain sessions.
 *
 * Handles namespace building and permission seeding during session proposal
 * approval. Request/response mapping is handled separately by
 * `tronRequestMapper` / `tronResponseMapper`.
 */
export const tronAdapter: ChainAdapter = {
  namespace: KnownCaipNamespace.Tron,
  methods: METHODS,
  events: EVENTS,
  redirectMethods: REDIRECT_METHODS,
  emissionPriority: 10,

  /**
   * Normalize Tron CAIP-2 chain IDs from hex to decimal format.
   * Some dapps send `tron:0x2b6653dc` instead of `tron:728126428`.
   */
  normalizeCaipChainId(caipChainId: string): string {
    const chainRef = caipChainId.slice(TRON_PREFIX.length);
    if (chainRef.startsWith('0x')) {
      const decimalRef = parseInt(chainRef, 16);
      const normalized = `${TRON_PREFIX}${decimalRef}`;
      DevLogger.log('[wc][tron] normalize inbound chainId hex->dec', {
        input: caipChainId,
        output: normalized,
      });
      return normalized;
    }
    return caipChainId;
  },

  /**
   * Seed Tron EOA accounts into the CAIP-25 caveat before session approval.
   * This ensures Tron authorization is visible alongside EVM when the
   * proposal handler reads scoped permissions.
   *
   * @param params - Contains the WC channel ID.
   */
  async onBeforeApprove({ channelId }) {
    const tronAddresses = listTronEoaAddresses();
    if (tronAddresses.length === 0) {
      return;
    }
    try {
      const tronCaipAccountIds = tronAddresses.map(
        (address) => `${FALLBACK_TRON_CHAIN}:${address}` as CaipAccountId,
      );
      addPermittedAccounts(channelId, tronCaipAccountIds);
    } catch (err) {
      DevLogger.log('[wc][tron] onBeforeApprove addPermittedAccounts failed', {
        err,
      });
    }
  },

  /**
   * Build the Tron namespace slice for a WalletConnect session.
   *
   * Echoes back exactly the CAIP chain IDs the dapp requested (dapp Tron
   * adapters crash on mismatches). Falls back to mainnet when no chains
   * are requested. Returns `undefined` if neither chains nor accounts
   * are available.
   *
   * @param params - Contains the proposal and WC channel ID.
   * @returns The namespace config or `undefined`.
   */
  async buildNamespace({
    proposal,
    channelId,
  }): Promise<NamespaceConfig | undefined> {
    const requestedChains = getRequestedTronChainIds(proposal);

    const hasTronRequest = requestedChains.length > 0;
    const tronChains = hasTronRequest
      ? Array.from(new Set(requestedChains))
      : [FALLBACK_TRON_CHAIN];

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

    if (!hasTronRequest && addresses.length === 0) {
      return undefined;
    }

    const accounts = addresses.flatMap((address) =>
      tronChains.map((chain) => `${chain}:${address}`),
    );

    return { chains: tronChains, methods: METHODS, events: EVENTS, accounts };
  },
};
