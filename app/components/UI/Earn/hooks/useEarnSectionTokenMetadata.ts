import { useEffect, useMemo, useState } from 'react';
import {
  fetchTokenAssets,
  type TokenAsset,
} from '../../../hooks/useTokensData/useTokensData';

interface EarnSectionTokenMetadataState {
  tokensByAssetId: Record<string, TokenAsset>;
  isLoading: boolean;
  error: Error | null;
}

const EMPTY_STATE: EarnSectionTokenMetadataState = {
  tokensByAssetId: {},
  isLoading: false,
  error: null,
};

/**
 * Loads metadata for unheld lending assets while preserving an explicit error
 * state so EarnSection never silently substitutes incomplete token data.
 */
const useEarnSectionTokenMetadata = (assetIds: string[]) => {
  const assetIdsKey = useMemo(
    () =>
      [...new Set(assetIds.map((assetId) => assetId.toLowerCase()))].join(','),
    [assetIds],
  );
  const [state, setState] =
    useState<EarnSectionTokenMetadataState>(EMPTY_STATE);

  useEffect(() => {
    if (!assetIdsKey) {
      setState(EMPTY_STATE);
      return;
    }

    let cancelled = false;
    setState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    const loadMetadata = async () => {
      try {
        // fetchTokenAssets shares module-level cache and in-flight requests.
        const tokens = await fetchTokenAssets(assetIdsKey.split(','));
        if (cancelled) return;

        setState({
          tokensByAssetId: Object.fromEntries(
            tokens.map((token) => [token.assetId.toLowerCase(), token]),
          ),
          isLoading: false,
          error: null,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        setState({
          tokensByAssetId: {},
          isLoading: false,
          error:
            error instanceof Error
              ? error
              : new Error('Failed to load Earn asset metadata'),
        });
      }
    };

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, [assetIdsKey]);

  return state;
};

export default useEarnSectionTokenMetadata;
