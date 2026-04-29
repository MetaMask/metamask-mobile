import {
  fetchTokenAssets,
  normalizeCaipAssetIdForTokenApi,
  type TokenSecurityData,
} from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

interface Waiter {
  resolve: (data: TokenSecurityData | null) => void;
}

const waitersByAsset = new Map<CaipAssetType, Waiter[]>();

let flushTimer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_MS = 32;

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

  try {
    const assets = await fetchTokenAssets(assetIds, {
      includeTokenSecurityData: true,
    });
    const byAssetId = new Map<CaipAssetType, TokenSecurityData | null>();
    for (const a of assets) {
      const key = normalizeCaipAssetIdForTokenApi(a.assetId as CaipAssetType);
      byAssetId.set(key, a.securityData ?? null);
    }
    resolveAll(
      (id) => byAssetId.get(normalizeCaipAssetIdForTokenApi(id)) ?? null,
    );
  } catch {
    resolveAll(() => null);
  }
}

/**
 * Batches concurrent `fetchTokenAssets` calls into one request (DataLoader-style).
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
