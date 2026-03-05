import { useEffect, useState, useRef, useCallback } from 'react';
import type { CaipAssetType } from '@metamask/utils';
import {
  fetchTokenAssets,
  TokenSecurityData,
} from '@metamask/assets-controllers';

const REFRESH_INTERVAL_MS = 60_000;

interface UseTokenSecurityDataOpts {
  /** CAIP-19 asset ID. When null, no fetch is attempted. */
  assetId: CaipAssetType | null;
  /** Pre-fetched security data from trending/search — returned immediately if provided. */
  prefetchedData?: TokenSecurityData;
}

interface UseTokenSecurityDataResult {
  securityData: TokenSecurityData | null;
  isLoading: boolean;
  error: Error | null;
  /** UTC timestamp of when the data was last successfully loaded. */
  fetchedAt: Date | null;
}

export const useTokenSecurityData = ({
  assetId,
  prefetchedData,
}: UseTokenSecurityDataOpts): UseTokenSecurityDataResult => {
  const [securityData, setSecurityData] = useState<TokenSecurityData | null>(
    prefetchedData ?? null,
  );
  const [isLoading, setIsLoading] = useState(!prefetchedData && !!assetId);
  const [error, setError] = useState<Error | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(
    prefetchedData ? new Date() : null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!assetId) return;
    try {
      const assets = await fetchTokenAssets([assetId], {
        includeTokenSecurityData: true,
      });
      if (!isMountedRef.current) return;
      const asset = assets?.[0];
      setSecurityData(asset?.securityData ?? null);
      setFetchedAt(new Date());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err as Error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [assetId]);

  useEffect(() => {
    isMountedRef.current = true;

    if (prefetchedData) {
      setSecurityData(prefetchedData);
      setFetchedAt(new Date());
      setIsLoading(false);
      return;
    }

    if (!assetId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchData();

    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [assetId, prefetchedData, fetchData]);

  return { securityData, isLoading, error, fetchedAt };
};
