/**
 * Tron-specific WalletConnect helpers.
 *
 * This module owns everything related to handling Tron WalletConnect
 * sessions inside the wallet: mapping WalletConnect-shaped requests
 * into the parameter shape the Tron Snap expects, normalizing the Snap
 * response back into what Tron dapps expect, seeding Tron accounts into
 * the CAIP-25 caveat at session-proposal time, building the `tron`
 * namespace slice for the WalletConnect session, and detecting whether
 * a dapp proposal references Tron at all.
 *
 * EVM logic stays where it is — this file is non-EVM only.
 */

import { TrxAccountType, TrxScope } from '@metamask/keyring-api';
import {
  type CaipAccountId,
  KnownCaipNamespace,
  parseCaipAccountId,
} from '@metamask/utils';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

import Engine from '../../../Engine';
import { addPermittedAccounts } from '../../../Permissions';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import type { ChainAdapter } from '../types';

interface SnapMappedRequest {
  method: string;
  params: unknown;
}

/** WalletConnect methods the wallet exposes for the Tron namespace. */
const TRON_METHODS: string[] = ['tron_signTransaction', 'tron_signMessage'];

/** WalletConnect events the wallet may emit for the Tron namespace. */
const TRON_EVENTS: readonly string[] = [];

/** CAIP-2 prefix used to identify Tron chain ids in proposals. */
const TRON_PREFIX = 'tron:';
const DEFAULT_TRON_CHAIN_ID = 'tron:0x2b6653dc';

export const normalizeCaipChainIdInboundForWalletConnectTron = (
  caipChainId: string,
): string => {
  if (!caipChainId.startsWith(TRON_PREFIX)) {
    return caipChainId;
  }
  const chainRef = caipChainId.slice(TRON_PREFIX.length);
  if (chainRef.startsWith('0x')) {
    return `tron:${parseInt(chainRef, 16)}`;
  }
  return caipChainId;
};

export const normalizeCaipChainIdOutboundForWalletConnectTron = (
  caipChainId: string,
): string => {
  if (!caipChainId.startsWith(TRON_PREFIX)) {
    return caipChainId;
  }
  const chainRef = caipChainId.slice(TRON_PREFIX.length);
  if (!chainRef.startsWith('0x')) {
    if (!/^\d+$/.test(chainRef)) {
      return caipChainId;
    }
    return `tron:0x${parseInt(chainRef, 10).toString(16)}`;
  }
  return caipChainId;
};

export const getCompatibleTronCaipChainIdsForWalletConnect = (
  caipChainId: string,
): string[] =>
  Array.from(
    new Set([
      caipChainId,
      normalizeCaipChainIdInboundForWalletConnectTron(caipChainId),
      normalizeCaipChainIdOutboundForWalletConnectTron(caipChainId),
    ]),
  );

/**
 * Minimal shape of the relevant parts of a WalletConnect session
 * proposal — local typing keeps the dependency on `@walletconnect/types`
 * out of this module.
 */
export interface TronProposalLike {
  requiredNamespaces?: Record<
    string,
    { chains?: string[]; methods?: string[]; events?: string[] } | undefined
  >;
  optionalNamespaces?: Record<
    string,
    { chains?: string[]; methods?: string[]; events?: string[] } | undefined
  >;
}

/**
 * Shape of a single namespace slice in WalletConnect's approved
 * namespaces map. Mirrors `SessionTypes.Namespace` but kept loose.
 */
export interface TronNamespaceSlice {
  chains: string[];
  methods: string[];
  events: string[];
  accounts: `${string}:${string}:${string}`[];
}

/**
 * List Tron EOA addresses currently managed by the wallet.
 */
const listTronEoaAddresses = (): string[] =>
  Engine.context.AccountsController.listAccounts()
    .filter((account: { type: string }) => account.type === TrxAccountType.Eoa)
    .map((account: { address: string }) => account.address);

export const buildTronScopedPermissionsNamespace = ({
  channelId,
  permittedChains,
}: {
  channelId: string;
  permittedChains: string[];
}): TronNamespaceSlice | undefined => {
  const tronChains = permittedChains
    .filter((chain) => chain.startsWith(`${KnownCaipNamespace.Tron}:`))
    .flatMap((chain) => getCompatibleTronCaipChainIdsForWalletConnect(chain));
  const uniqueTronChains = Array.from(new Set(tronChains));

  let permittedTronAccountStrings: string[] = [];
  try {
    const tronPermissionCaveat = Engine.context.PermissionController?.getCaveat(
      channelId,
      Caip25EndowmentPermissionName,
      Caip25CaveatType,
    );
    if (tronPermissionCaveat) {
      permittedTronAccountStrings = getCaipAccountIdsFromCaip25CaveatValue(
        tronPermissionCaveat.value as Parameters<
          typeof getCaipAccountIdsFromCaip25CaveatValue
        >[0],
      )
        .filter((account) => account.startsWith(`${KnownCaipNamespace.Tron}:`))
        .flatMap((account) => {
          try {
            const parsedAccount = parseCaipAccountId(account);
            if (parsedAccount.chain.namespace !== KnownCaipNamespace.Tron) {
              return [account];
            }
            const chainId = `${parsedAccount.chain.namespace}:${parsedAccount.chain.reference}`;
            return getCompatibleTronCaipChainIdsForWalletConnect(chainId).map(
              (compatibleChainId) =>
                `${compatibleChainId}:${parsedAccount.address}`,
            );
          } catch {
            return [account];
          }
        });
    }
  } catch (error) {
    if (!(error instanceof PermissionDoesNotExistError)) {
      DevLogger.log(
        '[wc][multichain/tron] failed to read tron permission caveat',
        error,
      );
    }
  }

  const tronAccounts = listTronEoaAddresses();
  if (uniqueTronChains.length > 0) {
    const discoveredTronAccountStrings = tronAccounts.flatMap((address) =>
      uniqueTronChains.map((tronChainId) => `${tronChainId}:${address}`),
    );
    return {
      chains: uniqueTronChains,
      methods: [...TRON_METHODS],
      events: [...TRON_EVENTS],
      accounts: Array.from(
        new Set([
          ...permittedTronAccountStrings,
          ...discoveredTronAccountStrings,
        ]),
      ) as `${string}:${string}:${string}`[],
    };
  }

  if (tronAccounts.length > 0) {
    const tronChainIds = getCompatibleTronCaipChainIdsForWalletConnect(
      TrxScope.Mainnet,
    );
    return {
      chains: tronChainIds,
      methods: [...TRON_METHODS],
      events: [...TRON_EVENTS],
      accounts: tronAccounts.flatMap((address) =>
        tronChainIds.map((tronChainId) => `${tronChainId}:${address}`),
      ) as `${string}:${string}:${string}`[],
    };
  }

  return undefined;
};

const extractTronRawDataHex = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    raw_data_hex?: unknown;
    rawDataHex?: unknown;
    transaction?: unknown;
    tx?: unknown;
  };

  if (typeof candidate.raw_data_hex === 'string') {
    return candidate.raw_data_hex;
  }
  if (typeof candidate.rawDataHex === 'string') {
    return candidate.rawDataHex;
  }
  return (
    extractTronRawDataHex(candidate.transaction) ??
    extractTronRawDataHex(candidate.tx)
  );
};

const extractTronType = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    type?: unknown;
    transaction?: unknown;
    tx?: unknown;
    raw_data?: { contract?: { type?: unknown }[] };
  };

  if (typeof candidate.type === 'string' && candidate.type.length > 0) {
    return candidate.type;
  }
  const contractType = candidate.raw_data?.contract?.[0]?.type;
  if (typeof contractType === 'string' && contractType.length > 0) {
    return contractType;
  }
  return (
    extractTronType(candidate.transaction) ?? extractTronType(candidate.tx)
  );
};

/**
 * Map a WalletConnect-shaped Tron request into the params shape the Tron
 * Snap expects. Unrecognized methods are passed through unchanged.
 */
export const mapTronRequestForSnap = ({
  method,
  params,
}: {
  method: string;
  params: unknown;
}): SnapMappedRequest => {
  const firstParam = Array.isArray(params)
    ? params.length > 0
      ? params[0]
      : undefined
    : params && typeof params === 'object'
      ? params
      : undefined;

  if (method === 'tron_signMessage') {
    const mappedParams: Record<string, string> = {};
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    const message =
      firstParam && typeof firstParam === 'object' && 'message' in firstParam
        ? firstParam.message
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }
    if (typeof message === 'string') {
      mappedParams.message = message;
    }

    return {
      method: 'signMessage',
      params: mappedParams,
    };
  }

  if (method === 'tron_signTransaction') {
    const transaction =
      firstParam &&
      typeof firstParam === 'object' &&
      'transaction' in firstParam
        ? (firstParam.transaction as
            | {
                raw_data_hex?: string;
                rawDataHex?: string;
                type?: string;
              }
            | undefined)
        : (firstParam as
            | {
                raw_data_hex?: string;
                rawDataHex?: string;
                type?: string;
              }
            | undefined);

    const rawDataHex = extractTronRawDataHex(firstParam ?? transaction);
    const type = extractTronType(firstParam ?? transaction);

    const mappedTransaction: Record<string, string> = {};
    if (typeof rawDataHex === 'string') {
      mappedTransaction.rawDataHex = rawDataHex;
    }
    if (typeof type === 'string') {
      mappedTransaction.type = type;
    }

    const mappedParams: {
      address?: string;
      transaction: Record<string, string>;
    } = {
      transaction: mappedTransaction,
    };
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }

    return {
      method: 'signTransaction',
      params: mappedParams,
    };
  }

  if (method === 'tron_sendTransaction') {
    return {
      method: 'sendTransaction',
      params,
    };
  }

  if (method === 'tron_getBalance') {
    return {
      method: 'getBalance',
      params,
    };
  }

  return { method, params };
};

/**
 * Normalize the response that the Tron Snap returns for a Tron WalletConnect
 * request before forwarding it to the dapp.
 *
 * Tron dapps that initiated a `tron_signTransaction` expect to receive the
 * original transaction object with a `signature` field appended. The Snap,
 * however, returns just `{ signature }`. When we detect that pattern, we
 * re-attach the original transaction so the dapp can broadcast it.
 *
 * Other Tron methods are returned unchanged.
 */
export const normalizeTronSnapResponse = ({
  method,
  params,
  result,
}: {
  method: string;
  params: unknown;
  result: unknown;
}): unknown => {
  if (method !== 'tron_signTransaction') {
    return result;
  }

  const firstParam = Array.isArray(params) ? params[0] : params;
  const transactionContainer =
    typeof firstParam === 'object' && firstParam !== null
      ? (firstParam as Record<string, unknown>).transaction
      : undefined;

  const originalTransaction =
    typeof transactionContainer === 'object' &&
    transactionContainer !== null &&
    !Array.isArray(transactionContainer) &&
    typeof (transactionContainer as Record<string, unknown>).transaction ===
      'object' &&
    (transactionContainer as Record<string, unknown>).transaction !== null
      ? ((transactionContainer as Record<string, unknown>)
          .transaction as Record<string, unknown>)
      : typeof transactionContainer === 'object' &&
          transactionContainer !== null &&
          !Array.isArray(transactionContainer)
        ? (transactionContainer as Record<string, unknown>)
        : undefined;

  const resultObject =
    typeof result === 'object' && result !== null && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : undefined;
  const signatureValue = resultObject?.signature;
  const normalizedSignature = Array.isArray(signatureValue)
    ? signatureValue
    : typeof signatureValue === 'string'
      ? [signatureValue]
      : undefined;

  if (
    originalTransaction &&
    normalizedSignature &&
    !(typeof resultObject?.txID === 'string')
  ) {
    return {
      ...originalTransaction,
      signature: normalizedSignature,
    };
  }

  return result;
};

/**
 * Seed Tron accounts into the CAIP-25 caveat for the given WalletConnect
 * channel. No-op if the wallet has no Tron EOAs. Errors are swallowed and
 * logged to mirror the previous best-effort behavior.
 */
export const seedTronPermissions = (channelId: string): void => {
  try {
    const tronAddresses = listTronEoaAddresses();
    if (tronAddresses.length === 0) {
      return;
    }
    const tronCaipAccountIds = tronAddresses.map(
      (address) => `${TrxScope.Mainnet}:${address}` as CaipAccountId,
    );
    addPermittedAccounts(channelId, tronCaipAccountIds);
    DevLogger.log(
      'WC2::session_proposal Tron accounts added to permissions',
      tronCaipAccountIds,
    );
  } catch (err) {
    DevLogger.log(
      'WC2::session_proposal error adding Tron account permissions',
      err,
    );
  }
};

/**
 * Collect every Tron CAIP-2 chain ID requested by the dapp proposal.
 * Looks at both `requiredNamespaces.tron` and `optionalNamespaces.tron`,
 * plus any bare `tron:<ref>` chain reference appearing under any
 * other namespace key.
 */
const collectRequestedTronChains = (proposal: TronProposalLike): string[] => {
  const allNamespaces = {
    ...(proposal.optionalNamespaces ?? {}),
    ...(proposal.requiredNamespaces ?? {}),
  };
  const direct = allNamespaces.tron?.chains ?? [];
  const bare = Object.values(allNamespaces).flatMap(
    (ns) => ns?.chains?.filter((chain) => chain.startsWith(TRON_PREFIX)) ?? [],
  );
  return Array.from(new Set([...direct, ...bare]));
};

/**
 * Returns `true` when the dapp proposal references Tron in any way:
 * either via a top-level `tron` namespace key or via a bare `tron:<ref>`
 * chain id appearing under another namespace.
 */
export const proposalReferencesTron = (proposal: TronProposalLike): boolean =>
  Boolean(proposal.requiredNamespaces?.tron) ||
  Boolean(proposal.optionalNamespaces?.tron) ||
  collectRequestedTronChains(proposal).length > 0;

/**
 * Build the `tron` namespace slice for the approved WalletConnect
 * session, given the dapp proposal and any Tron addresses already
 * surfaced via scoped permissions.
 *
 * Returns `undefined` when the proposal doesn't reference Tron, leaving
 * the caller's namespaces map untouched.
 */
export const buildTronNamespace = ({
  proposal,
  existingTronAccounts = [],
  existingTronMethods,
  existingTronEvents,
}: {
  proposal: TronProposalLike;
  existingTronAccounts?: string[];
  existingTronMethods?: string[];
  existingTronEvents?: string[];
}): TronNamespaceSlice | undefined => {
  if (!proposalReferencesTron(proposal)) {
    return undefined;
  }

  const allNamespaces = {
    ...(proposal.optionalNamespaces ?? {}),
    ...(proposal.requiredNamespaces ?? {}),
  };
  const requestedTronChains = collectRequestedTronChains(proposal);
  const tronChains =
    requestedTronChains.length > 0
      ? requestedTronChains
      : [DEFAULT_TRON_CHAIN_ID];

  const requestedTronMethods = allNamespaces.tron?.methods ?? [];
  const requestedTronEvents = allNamespaces.tron?.events ?? [];

  const existingAddresses = Array.from(
    new Set(
      existingTronAccounts
        .map((account) => {
          const parts = account.split(':');
          return parts.length >= 3 ? parts.slice(2).join(':') : '';
        })
        .filter(Boolean),
    ),
  );
  const fallbackAddresses =
    existingAddresses.length > 0 ? [] : listTronEoaAddresses();
  const tronAddresses = Array.from(
    new Set([...existingAddresses, ...fallbackAddresses]),
  );

  const slice: TronNamespaceSlice = {
    chains: tronChains,
    methods:
      requestedTronMethods.length > 0
        ? requestedTronMethods
        : (existingTronMethods ?? [...TRON_METHODS]),
    events:
      requestedTronEvents.length > 0
        ? requestedTronEvents
        : (existingTronEvents ?? [...TRON_EVENTS]),
    accounts: tronAddresses.flatMap((address) =>
      tronChains.map(
        (chainId) => `${chainId}:${address}` as `${string}:${string}:${string}`,
      ),
    ),
  };

  DevLogger.log(
    '[wc][multichain/tron.buildTronNamespace] built tron namespace',
    {
      requestedTronChains,
      finalTronChains: slice.chains,
      accountsCount: slice.accounts.length,
      addressSource:
        existingAddresses.length > 0
          ? 'scopedPermissions'
          : 'accountsController',
    },
  );

  return slice;
};

/**
 * `ChainAdapter` implementation for Tron. Registered in
 * `multichain/registry.ts` behind the `tron` feature flag.
 *
 * The adapter wraps the helper functions above so the multichain
 * dispatcher can treat Tron the same as any future non-EVM chain.
 */
export const tronAdapter: ChainAdapter = {
  namespace: 'tron',
  redirectMethods: ['tron_signTransaction', 'tron_signMessage'],
  proposalReferencesNamespace: proposalReferencesTron,
  onBeforeApprove: ({ proposal, channelId }) => {
    if (!proposalReferencesTron(proposal)) {
      return;
    }
    seedTronPermissions(channelId);
  },
  buildNamespace: ({
    proposal,
    existingAccounts,
    existingMethods,
    existingEvents,
  }) =>
    buildTronNamespace({
      proposal,
      existingTronAccounts: existingAccounts,
      existingTronMethods: existingMethods,
      existingTronEvents: existingEvents,
    }),
  mapRequestForSnap: mapTronRequestForSnap,
  normalizeSnapResponse: normalizeTronSnapResponse,
};
