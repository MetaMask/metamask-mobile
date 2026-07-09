///: BEGIN:ONLY_INCLUDE_IF(stellar)
import type { InternalAccount } from '@metamask/keyring-internal-api';
import {
  type CaipAssetType,
  type CaipChainId,
  KnownCaipNamespace,
  parseCaipAssetType,
} from '@metamask/utils';
import Engine from '../../core/Engine';
import Logger from '../Logger';
import { requestStellarGetAccountAssetInfo } from './stellar-snap-client-requests';

const ACCOUNT_ASSET_INFO_SNAP_TIMEOUT_MS = 15_000;
const ENRICHMENT_TIMEOUT = Symbol('enrichmentTimeout');

const inFlightByKey = new Map<string, Promise<void>>();

type BalanceRow = {
  amount?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Returns true when the CAIP-19 asset id is a Stellar classic (`asset:`) asset.
 */
export function isStellarClassicAssetId(assetId: string): boolean {
  try {
    const parsed = parseCaipAssetType(assetId as CaipAssetType);
    return (
      parsed.chain.namespace === KnownCaipNamespace.Stellar &&
      parsed.assetNamespace === 'asset'
    );
  } catch {
    return false;
  }
}

/**
 * Lists Stellar classic asset ids for an account on a chain from AssetsController
 * balances, optionally including custom assets that may have dropped off the
 * Snap asset list (e.g. limit-0 trustline tombstones).
 */
export function listStellarClassicAssetIdsForAccount(
  accountId: string,
  chainId: CaipChainId,
  options?: { includeCustomAssets?: boolean },
): CaipAssetType[] {
  const { AssetsController } = Engine.context;
  const balances = AssetsController.state.assetsBalance[accountId] ?? {};
  const assetIds = new Set<CaipAssetType>();

  for (const assetId of Object.keys(balances)) {
    try {
      const parsed = parseCaipAssetType(assetId as CaipAssetType);
      if (parsed.chainId === chainId && parsed.assetNamespace === 'asset') {
        assetIds.add(assetId as CaipAssetType);
      }
    } catch {
      // Ignore malformed asset ids.
    }
  }

  if (options?.includeCustomAssets) {
    for (const assetId of AssetsController.getCustomAssets(accountId)) {
      try {
        const parsed = parseCaipAssetType(assetId as CaipAssetType);
        if (parsed.chainId === chainId && parsed.assetNamespace === 'asset') {
          assetIds.add(assetId as CaipAssetType);
        }
      } catch {
        // Ignore malformed custom asset ids.
      }
    }
  }

  return [...assetIds];
}

/**
 * Collects Stellar classic assets that are present in balances but missing
 * `metadata`, grouped by account and chain.
 */
export function findAccountsNeedingStellarEnrichment(
  assetsBalance: Record<string, Record<string, BalanceRow>>,
): Map<string, Map<CaipChainId, CaipAssetType[]>> {
  const byAccount = new Map<string, Map<CaipChainId, CaipAssetType[]>>();

  for (const [accountId, accountBalances] of Object.entries(assetsBalance)) {
    for (const [assetId, row] of Object.entries(accountBalances)) {
      if (row?.metadata !== undefined) {
        continue;
      }
      if (!isStellarClassicAssetId(assetId)) {
        continue;
      }

      let chainId: CaipChainId;
      try {
        chainId = parseCaipAssetType(assetId as CaipAssetType)
          .chainId as CaipChainId;
      } catch {
        continue;
      }

      let byChain = byAccount.get(accountId);
      if (!byChain) {
        byChain = new Map();
        byAccount.set(accountId, byChain);
      }
      const assets = byChain.get(chainId) ?? [];
      assets.push(assetId as CaipAssetType);
      byChain.set(chainId, assets);
    }
  }

  return byAccount;
}

async function fetchAccountAssetInfoWithTimeout(params: {
  accountId: string;
  chainId: CaipChainId;
  assetIds: CaipAssetType[];
}): Promise<Record<string, Record<string, unknown>> | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const snapRequest = requestStellarGetAccountAssetInfo({
    accountId: params.accountId,
    scope: params.chainId,
    assets: params.assetIds,
  });

  try {
    const result = await Promise.race([
      snapRequest,
      new Promise<typeof ENRICHMENT_TIMEOUT>((resolve) => {
        timeoutId = setTimeout(
          () => resolve(ENRICHMENT_TIMEOUT),
          ACCOUNT_ASSET_INFO_SNAP_TIMEOUT_MS,
        );
      }),
    ]);

    if (result === ENRICHMENT_TIMEOUT) {
      snapRequest.catch((error) => {
        Logger.error(
          error as Error,
          'enrichStellarAccountAssetInfo: getAccountAssetInfo failed after timeout',
        );
      });
      return undefined;
    }

    return result;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Fetches Snap `getAccountAssetInfo` for the given assets and merges the result
 * into `AssetsController` balance rows.
 *
 * Concurrent calls for the same account/chain share one in-flight request.
 * Pass `force: true` after trustline changes so existing enrichment is refreshed.
 */
export async function enrichStellarAccountAssetInfo({
  account,
  chainId,
  assetIds,
  force = false,
}: {
  account: InternalAccount;
  chainId: CaipChainId;
  assetIds: CaipAssetType[];
  force?: boolean;
}): Promise<void> {
  if (assetIds.length === 0) {
    return;
  }

  const key = `${account.id}:${chainId}`;
  const existing = inFlightByKey.get(key);
  if (existing) {
    await existing;
    // Concurrent callers share the in-flight request. A later forced refresh
    // (e.g. after trustline change) starts a new request once the shared one
    // has settled.
    if (!force) {
      return;
    }
  }

  const run = (async () => {
    const { AssetsController } = Engine.context;
    const existingBalances =
      AssetsController.state.assetsBalance[account.id] ?? {};

    let enrichment: Record<string, Record<string, unknown>> | undefined;
    try {
      enrichment = await fetchAccountAssetInfoWithTimeout({
        accountId: account.id,
        chainId,
        assetIds,
      });
    } catch (error) {
      Logger.error(
        error as Error,
        'enrichStellarAccountAssetInfo: getAccountAssetInfo failed',
      );
      return;
    }

    if (!enrichment || typeof enrichment !== 'object') {
      return;
    }

    const assetsBalance: Record<
      string,
      Record<string, { amount: string; metadata?: Record<string, unknown> }>
    > = {
      [account.id]: {},
    };

    for (const assetId of assetIds) {
      const metadata = enrichment[assetId];
      if (metadata === undefined) {
        continue;
      }

      const existingRow = existingBalances[assetId] as BalanceRow | undefined;
      assetsBalance[account.id][assetId] = {
        amount: existingRow?.amount ?? '0',
        metadata,
      };
    }

    if (Object.keys(assetsBalance[account.id]).length === 0) {
      return;
    }

    try {
      await AssetsController.handleAssetsUpdate(
        { updateMode: 'merge', assetsBalance },
        'StellarAccountAssetInfoEnrichment',
      );
    } catch (error) {
      Logger.error(
        error as Error,
        'enrichStellarAccountAssetInfo: handleAssetsUpdate failed',
      );
    }
  })().finally(() => {
    inFlightByKey.delete(key);
  });

  inFlightByKey.set(key, run);
  await run;
}

/**
 * Enriches every Stellar classic asset currently held for the account/chain,
 * including custom assets that may no longer appear in the Snap asset list.
 */
export async function enrichAllStellarClassicAccountAssetInfo(
  account: InternalAccount,
  chainId: CaipChainId,
  options?: { force?: boolean },
): Promise<void> {
  const assetIds = listStellarClassicAssetIdsForAccount(account.id, chainId, {
    includeCustomAssets: true,
  });
  await enrichStellarAccountAssetInfo({
    account,
    chainId,
    assetIds,
    force: options?.force,
  });
}

/**
 * Test helper to clear in-flight dedupe state between unit tests.
 */
export function resetStellarAccountAssetInfoEnrichmentInFlight(): void {
  inFlightByKey.clear();
}
///: END:ONLY_INCLUDE_IF
