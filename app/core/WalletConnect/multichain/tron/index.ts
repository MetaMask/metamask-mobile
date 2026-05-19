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
  type CaipChainId,
  type CaipAccountId,
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
import {
  addPermittedAccounts,
  updatePermittedChains,
  sortMultichainAccountsByLastSelected,
  getPermittedChains,
} from '../../../Permissions';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { doesProposalIncludeNamespace } from '../utils';
import type {
  ChainAdapter,
  NamespaceConfig,
  ProposalParamsLight,
  SnapMappedRequest,
} from '../types';

/** WalletConnect methods the wallet exposes for the Tron namespace. */
const TRON_METHODS: string[] = ['tron_signTransaction', 'tron_signMessage'];

/** WalletConnect events the wallet may emit for the Tron namespace. */
const TRON_EVENTS: readonly string[] = [];

/** CAIP-2 prefix used to identify Tron chain ids in proposals. */
const DEFAULT_TRON_CHAIN_ID: CaipChainId = TrxScope.Mainnet;

/**
 * Normalize a CAIP chain ID coming in from a dapp proposal or request params
 * WalletConnect use hex chain references for Tron, but the Tron Snap use decimal.
 */
const normalizeCaipChainIdInbound = (caipChainId: CaipChainId): CaipChainId => {
  const { namespace, reference } = parseCaipChainId(caipChainId);

  if (namespace !== KnownCaipNamespace.Tron) {
    return caipChainId;
  }

  if (reference.startsWith('0x')) {
    return `${namespace}:${parseInt(reference, 16)}`;
  }
  return caipChainId;
};

/**
 * Normalize a CAIP chain ID going out to a dapp response
 * WalletConnect use hex chain references for Tron, but the Tron Snap use decimal.
 */
const normalizeCaipChainIdOutbound = (
  caipChainId: CaipChainId,
): CaipChainId => {
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
};

/**
 * Normalize a CAIP account ID to wallet connect shape before sending it back to the dapp.
 */
const normalizeTronAccountIdOutbound = (
  caipAccountId: CaipAccountId,
): CaipAccountId => {
  const { address, chainId } = parseCaipAccountId(caipAccountId);
  const normalizedCaipChainId = normalizeCaipChainIdOutbound(chainId);
  return `${normalizedCaipChainId}:${address}`;
};

/**
 * Build this chain's namespace slice from the wallet's current state
 */
const getScopedPermissions = async ({
  channelId,
}: {
  channelId: string;
}): Promise<NamespaceConfig | undefined> => {
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

  // @TODO Doesn't seems to work as expected ...
  const sortedPermittedTronAccounts = sortMultichainAccountsByLastSelected(
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
const mapRequestInbound = ({
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
      // The Tron snap requires `message` to be base64-encoded
      // (validated against /^(?:[A-Za-z0-9+/]{4})*...$/ then decoded via
      // Buffer.from(message, 'base64').toString('utf8')).
      // WC dapps send either a hex string ('0x...') or a plain UTF-8 string.
      const utf8Message = message.startsWith('0x')
        ? Buffer.from(message.slice(2), 'hex').toString('utf8')
        : message;
      mappedParams.message = Buffer.from(utf8Message, 'utf8').toString(
        'base64',
      );
    }

    const mapped: SnapMappedRequest = {
      method: 'signMessage',
      params: mappedParams,
    };
    return mapped;
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

    const mapped: SnapMappedRequest = {
      method: 'signTransaction',
      params: mappedParams,
    };
    return mapped;
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
const mapRequestOutbound = ({
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
const enrichCaveatValue = ({
  proposal,
  caveatValue,
}: {
  proposal: ProposalParamsLight;
  caveatValue: Caip25CaveatValue;
}): Caip25CaveatValue => {
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
};

/**
 * `ChainAdapter` implementation for Tron. Registered in
 * `multichain/registry.ts` behind the `tron` feature flag.
 *
 * The adapter wraps the helper functions above so the multichain
 * dispatcher can treat Tron the same as any future non-EVM chain.
 */
export const tronAdapter: ChainAdapter = {
  namespace: KnownCaipNamespace.Tron,
  redirectMethods: ['tron_signTransaction', 'tron_signMessage'],
  approvedMethods: ['tron_signTransaction', 'tron_signMessage'],
  enrichCaveatValue,
  getScopedPermissions,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  mapRequestInbound,
  mapRequestOutbound,
};
