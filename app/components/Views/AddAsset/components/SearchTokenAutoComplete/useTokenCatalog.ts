import { useCallback, useEffect, useRef, useState } from 'react';
import { handleFetch } from '@metamask/controller-utils';

const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';

export const CATALOG_PAGE_SIZE = 25;

export interface CatalogAsset {
  assetId: string;
  decimals: number;
  name: string;
  symbol: string;
}

interface CatalogPage {
  data?: CatalogAsset[];
  pageInfo?: {
    hasNextPage?: boolean;
    endCursor?: string | null;
  };
}

interface CatalogState {
  chainId?: string;
  assets: CatalogAsset[];
}

interface PageInfo {
  chainId?: string;
  endCursor?: string;
  hasNextPage: boolean;
}

const fetchCatalogPage = async (
  caipChainId: string,
  after?: string,
): Promise<CatalogPage> => {
  const params = new URLSearchParams({ first: String(CATALOG_PAGE_SIZE) });
  if (after) {
    params.set('after', after);
  }

  const page: CatalogPage = await handleFetch(
    `${TOKEN_API_V3_BASE_URL}/chains/${caipChainId}/assets?${params.toString()}`,
  );

  if (!page || !Array.isArray(page.data)) {
    throw new Error('Invalid token catalog response');
  }

  return page;
};

/**
 * Pages through the full asset catalog of a non-EVM chain. Browsing the
 * catalog (instead of curated trending data) is what lets users find tokens
 * that are not trending, e.g. the long tail of Tron TRC-20s.
 */
export const useTokenCatalog = (
  caipChainId?: string,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const [catalog, setCatalog] = useState<CatalogState>({ assets: [] });
  const [pageInfo, setPageInfo] = useState<PageInfo>({ hasNextPage: false });
  const [isLoading, setIsLoading] = useState(Boolean(caipChainId && enabled));
  const [error, setError] = useState<Error | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const requestIdRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  const applyPage = useCallback((chainId: string, page: CatalogPage) => {
    setCatalog({ chainId, assets: page.data ?? [] });
    setPageInfo({
      chainId,
      endCursor: page.pageInfo?.endCursor ?? undefined,
      hasNextPage: page.pageInfo?.hasNextPage ?? false,
    });
  }, []);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    isLoadingMoreRef.current = false;
    setIsLoadingMore(false);
    setError(null);

    if (!caipChainId) {
      setCatalog({ assets: [] });
      setPageInfo({ hasNextPage: false });
      setIsLoading(false);
      return undefined;
    }

    if (!enabled) {
      setIsLoading(false);
      return undefined;
    }

    setCatalog({ chainId: caipChainId, assets: [] });
    setPageInfo({ chainId: caipChainId, hasNextPage: false });
    setIsLoading(true);
    fetchCatalogPage(caipChainId)
      .then((page) => {
        if (currentRequestId !== requestIdRef.current) return;
        applyPage(caipChainId, page);
      })
      .catch((err) => {
        if (currentRequestId !== requestIdRef.current) return;
        setError(err as Error);
      })
      .finally(() => {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [caipChainId, enabled, applyPage]);

  const loadMore = useCallback(async () => {
    if (
      !caipChainId ||
      !enabled ||
      !pageInfo.hasNextPage ||
      !pageInfo.endCursor ||
      isLoadingMoreRef.current ||
      isLoading
    ) {
      return;
    }

    const currentRequestId = requestIdRef.current;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = await fetchCatalogPage(caipChainId, pageInfo.endCursor);
      if (currentRequestId !== requestIdRef.current) return;

      setCatalog((previous) => {
        if (previous.chainId !== caipChainId) return previous;
        const seen = new Set(previous.assets.map((asset) => asset.assetId));
        return {
          chainId: caipChainId,
          assets: [
            ...previous.assets,
            ...(page.data ?? []).filter((asset) => !seen.has(asset.assetId)),
          ],
        };
      });
      setPageInfo({
        chainId: caipChainId,
        endCursor: page.pageInfo?.endCursor ?? undefined,
        hasNextPage: page.pageInfo?.hasNextPage ?? false,
      });
    } catch {
      // Keep the loaded page and cursor so the next onEndReached retries.
    } finally {
      if (currentRequestId === requestIdRef.current) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [
    caipChainId,
    enabled,
    pageInfo.hasNextPage,
    pageInfo.endCursor,
    isLoading,
  ]);

  const isCurrentChain = catalog.chainId === caipChainId;
  const isCurrentPageInfo = pageInfo.chainId === caipChainId;

  return {
    assets: isCurrentChain ? catalog.assets : [],
    isLoading,
    error,
    loadMore,
    isLoadingMore,
    hasNextPage: isCurrentPageInfo && pageInfo.hasNextPage,
  };
};
