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

/**
 * Component that displays a list of popular tokens for zero balance accounts.
 * Uses the usePopularTokens hook to fetch and display token data.
 * Exposes a refresh function via ref for pull-to-refresh support.
 * Auto-refreshes prices every minute.
 */
const PopularTokensList = forwardRef<SectionRefreshHandle>((_, ref) => {
  const { tokens, isInitialLoading, refetch } = usePopularTokens();

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

  return (
    <>
      {tokens.map((token) => (
        <PopularTokenRow key={token.assetId} token={token} />
      ))}
    </>
  );
});

export default PopularTokensList;
