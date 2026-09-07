import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchTokenAssets,
  type TokenAsset,
} from '../../../hooks/useTokensData/useTokensData';

interface EarnSectionTokenMetadataState {
  assetIdsKey: string;
  tokensByAssetId: Record<string, TokenAsset>;
  isLoading: boolean;
  isSettled: boolean;
  error: Error | null;
}

const EMPTY_STATE: EarnSectionTokenMetadataState = {
  assetIdsKey: '',
  tokensByAssetId: {},
  isLoading: false,
  isSettled: true,
  error: null,
};

/**
 * Loads metadata for unheld lending assets while preserving an explicit error
 * state so EarnSection never silently substitutes incomplete token data.
 */
const useEarnSectionTokenMetadata = (assetIds: string[], enabled = true) => {
  const assetIdsKey = useMemo(
    () =>
      [...new Set(assetIds.map((assetId) => assetId.toLowerCase()))].join(','),
    [assetIds],
  );
  const [state, setState] = useState<EarnSectionTokenMetadataState>(() => ({
    ...EMPTY_STATE,
    assetIdsKey,
    isLoading: Boolean(assetIdsKey),
    isSettled: !assetIdsKey,
  }));
  const requestIdRef = useRef(0);

  const loadMetadata = useCallback(async (): Promise<Error | null> => {
    if (!enabled) return null;

    const requestId = ++requestIdRef.current;
    if (!assetIdsKey) {
      setState(EMPTY_STATE);
      return null;
    }

    setState((current) => ({
      assetIdsKey,
      tokensByAssetId:
        current.assetIdsKey === assetIdsKey ? current.tokensByAssetId : {},
      isLoading: true,
      isSettled: false,
      error: null,
    }));

    try {
      // fetchTokenAssets shares module-level cache and in-flight requests.
      const tokens = await fetchTokenAssets(assetIdsKey.split(','));
      if (requestId !== requestIdRef.current) return null;

      setState({
        assetIdsKey,
        tokensByAssetId: Object.fromEntries(
          tokens.map((token) => [token.assetId.toLowerCase(), token]),
        ),
        isLoading: false,
        isSettled: true,
        error: null,
      });
      return null;
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error('Failed to load Earn asset metadata');
      if (requestId !== requestIdRef.current) return null;

      setState({
        assetIdsKey,
        tokensByAssetId: {},
        isLoading: false,
        isSettled: true,
        error: normalizedError,
      });
      return normalizedError;
    }
  }, [assetIdsKey, enabled]);

  useEffect(() => {
    if (!enabled) return;

    loadMetadata();

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, loadMetadata]);

  const refresh = useCallback(async () => {
    const error = await loadMetadata();
    if (error) {
      throw error;
    }
  }, [loadMetadata]);

  const isCurrentRequest = state.assetIdsKey === assetIdsKey;
  const hasMetadataForCurrentAssetIds =
    isCurrentRequest &&
    Boolean(assetIdsKey) &&
    assetIdsKey
      .split(',')
      .every((assetId) => state.tokensByAssetId[assetId] !== undefined);

  return {
    tokensByAssetId: isCurrentRequest ? state.tokensByAssetId : {},
    isLoading:
      enabled &&
      Boolean(assetIdsKey) &&
      (!isCurrentRequest ||
        (state.isLoading && !hasMetadataForCurrentAssetIds)),
    isSettled: isCurrentRequest && state.isSettled,
    error: isCurrentRequest ? state.error : null,
    refresh,
  };
};

export default useEarnSectionTokenMetadata;
