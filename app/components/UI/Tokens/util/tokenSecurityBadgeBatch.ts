import {
  fetchTokenAssets,
  type TokenSecurityData,
} from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

function normalizeCaipAssetIdForTokenApi(assetId: string): CaipAssetType {
  const match = /^eip155:(\d+)\/erc20:(0x[0-9a-fA-F]{40})$/.exec(
    String(assetId),
  );
  if (match) {
    return `eip155:${match[1]}/erc20:${match[2].toLowerCase()}` as CaipAssetType;
  }
  return assetId as CaipAssetType;
}

interface Waiter {
  resolve: (data: TokenSecurityData | null) => void;
}

const waitersByAsset = new Map<CaipAssetType, Waiter[]>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_MS = 32;

/** Token `/assets` API supports a bounded number of `assetIds` per request. */
const MAX_ASSETS_PER_REQUEST = 100;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function scheduleFlush() {
  if (flushTimer !== null) {
    return;
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush().catch(() => undefined);
  }, FLUSH_MS);
}

async function flush() {
  if (waitersByAsset.size === 0) {
    return;
  }

  const snapshot = new Map(waitersByAsset);
  waitersByAsset.clear();

  const assetIds = [...snapshot.keys()];

  const resolveAll = (
    getter: (id: CaipAssetType) => TokenSecurityData | null,
  ) => {
    for (const id of assetIds) {
      const waiters = snapshot.get(id) ?? [];
      const value = getter(id);
      waiters.forEach((w) => w.resolve(value));
    }
  };

  const byAssetId = new Map<CaipAssetType, TokenSecurityData | null>();
  try {
    for (const chunk of chunkArray(assetIds, MAX_ASSETS_PER_REQUEST)) {
      try {
        const assets = await fetchTokenAssets(chunk, {
          includeTokenSecurityData: true,
        });
        for (const a of assets) {
          byAssetId.set(a.assetId as CaipAssetType, a.securityData ?? null);
        }
      } catch {
        // Fail-open per chunk so large flushes still get partial data.
      }
    }
    resolveAll(
      (id) => byAssetId.get(normalizeCaipAssetIdForTokenApi(id)) ?? null,
    );
  } catch {
    resolveAll(() => null);
  }
}

/**
 * Batches concurrent `fetchTokenAssets` calls (DataLoader-style), splitting into
 * requests of at most {@link MAX_ASSETS_PER_REQUEST} asset ids when a flush is large.
 * Used by TanStack `useQuery` for token list security badges.
 */
export function requestTokenSecurityForAsset(
  assetId: CaipAssetType,
): Promise<TokenSecurityData | null> {
  return new Promise((resolve) => {
    const list = waitersByAsset.get(assetId) ?? [];
    list.push({ resolve });
    waitersByAsset.set(assetId, list);
    scheduleFlush();
  });
}
