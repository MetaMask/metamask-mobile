import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  getCaipAccountIdsFromCaip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { TrxAccountType, TrxScope } from '@metamask/keyring-api';
import { KnownCaipNamespace, type CaipAccountId } from '@metamask/utils';

import Engine from '../../Engine';
import { addPermittedAccounts } from '../../Permissions';
import { TRON_WALLET_SNAP_ID } from '../../SnapKeyring/TronWalletSnap';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import type {
  ChainAdapter,
  NamespaceConfig,
  ProposalLike,
  SnapMappedRequest,
} from './types';

const METHODS: string[] = ['tron_signTransaction', 'tron_signMessage'];

const EVENTS: string[] = [];

const REDIRECT_METHODS: string[] = ['tron_signTransaction', 'tron_signMessage'];

const TRON_PREFIX = `${KnownCaipNamespace.Tron}:` as const;

const FALLBACK_TRON_CHAIN = TrxScope.Mainnet;

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
 * Normalize the signing result Tron Snap returns into the legacy shape dapp
 * Tron adapters expect: the original transaction body with a `signature`
 * array appended. Only applies when the result doesn't already look like a
 * full transaction (`txID` is the canonical marker).
 */
const normalizeSignTransactionResult = (
  params: unknown,
  result: unknown,
): unknown => {
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

export const tronAdapter: ChainAdapter = {
  namespace: KnownCaipNamespace.Tron,
  methods: METHODS,
  events: EVENTS,
  redirectMethods: REDIRECT_METHODS,
  snapId: TRON_WALLET_SNAP_ID,

  /**
   * Before `approveSession` we register any Tron EOAs in the CAIP-25 caveat
   * for this channel. This way, when the proposal handler later reads scoped
   * permissions, Tron authorization already sits alongside EVM.
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

  async buildNamespace({
    proposal,
    channelId,
  }): Promise<NamespaceConfig | undefined> {
    const requestedChains = getRequestedTronChainIds(proposal);

    // Echo back exactly the CAIP chain ids the dapp requested. Dapp Tron
    // adapters look up each approved chain id in an internal config map
    // keyed by the exact CAIP format they sent and crash on mismatches
    // (e.g. unexpected decimal variant or unsolicited mainnet entry).
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

  adaptRequest({ method, params }): SnapMappedRequest {
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
      return { method: 'signMessage', params: mappedParams };
    }

    if (method === 'tron_signTransaction') {
      const transactionContainer =
        firstParam &&
        typeof firstParam === 'object' &&
        'transaction' in firstParam
          ? (firstParam as Record<string, unknown>).transaction
          : firstParam;

      const rawDataHex = extractTronRawDataHex(
        firstParam ?? transactionContainer,
      );
      const type = extractTronType(firstParam ?? transactionContainer);

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
      } = { transaction: mappedTransaction };
      const address =
        firstParam && typeof firstParam === 'object' && 'address' in firstParam
          ? firstParam.address
          : undefined;
      if (typeof address === 'string') {
        mappedParams.address = address;
      }

      return { method: 'signTransaction', params: mappedParams };
    }

    if (method === 'tron_sendTransaction') {
      return { method: 'sendTransaction', params };
    }

    if (method === 'tron_getBalance') {
      return { method: 'getBalance', params };
    }

    return { method, params };
  },

  adaptResponse({ method, params, result }) {
    if (method === 'tron_signTransaction') {
      return normalizeSignTransactionResult(params, result);
    }
    return result;
  },
};
