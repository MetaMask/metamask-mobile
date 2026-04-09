import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
} from 'react';
import { usePopularTokens } from '../hooks';
import PopularTokenRow from './PopularTokenRow';
import PopularTokensSkeleton from './PopularTokensSkeleton';
import { SectionRefreshHandle } from '../../../types';

const PRICE_REFRESH_INTERVAL_MS = 60_000; // 1 minute

interface PopularTokensListProps {
  /**
   * Called when error state changes. Parent uses this to render ErrorState
   * at section level (outside SectionRow to avoid double-padding).
   */
  onError?: (hasError: boolean) => void;
}

/**
 * Component that displays a list of popular tokens for zero balance accounts.
 * Uses the usePopularTokens hook to fetch and display token data.
 * Exposes a refresh function via ref for pull-to-refresh support.
 * Auto-refreshes prices every minute.
 *
 * Error handling: when initial load fails, returns null and calls onError(true).
 * The parent (TokensSection) renders ErrorState. On successful retry, onError(false)
 * is called and token rows are shown again.
 */
const PopularTokensList = forwardRef<
  SectionRefreshHandle,
  PopularTokensListProps
>(({ onError }, ref) => {
  const { tokens, isInitialLoading, error, refetch } = usePopularTokens();

  // Error state: initial load failed and we have no price data to show.
  // If a background refresh fails after a successful load, prices stay visible.
  const hasNoData = tokens.every((t) => t.price === undefined);
  const hasError = !isInitialLoading && error !== null && hasNoData;

  // Report error state changes to parent
  useEffect(() => {
    onError?.(hasError);
  }, [hasError, onError]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  // Auto-refresh prices every minute
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, PRICE_REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [refetch]);

  if (isInitialLoading) {
    return <PopularTokensSkeleton />;
  }

  // Return null when in error state — parent renders ErrorState
  if (hasError) {
    return null;
  }

  return (
    <>
      {tokens.map((token) => (
        <PopularTokenRow key={token.assetId} token={token} />
      ))}
    </>
  );
});

export default PopularTokensList;
