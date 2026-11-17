import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { fetchFollowingTokenPositions } from './fetchFollowingTokenPositions';
import type { FollowingTokenPositionsResponse } from './types';

export interface UseFollowingTokenPositionsOptions {
  /** Master gate (feature flag). When false the query stays disabled. */
  enabled?: boolean;
}

export interface UseFollowingTokenPositionsResult {
  data: FollowingTokenPositionsResponse | undefined;
  isLoading: boolean;
  error: unknown;
}

/**
 * Fetches the first page of followed traders holding `assetId` and their open
 * positions (Social API PR #398). Gated on unlock + the caller's `enabled` flag.
 *
 * TEMPORARY (ASSETS-4102 spike): this calls the raw endpoint directly via
 * `fetchFollowingTokenPositions` instead of a `SocialService` messenger action +
 * `@metamask/react-data-query` `useQuery`, because the package does not expose
 * the action yet. Restore the `useQuery` + `buildFollowingTokenPositionsQueryKey`
 * path (see git history) once the action ships.
 */
export const useFollowingTokenPositions = (
  assetId: string,
  { enabled = true }: UseFollowingTokenPositionsOptions = {},
): UseFollowingTokenPositionsResult => {
  const isUnlocked = useSelector(selectIsUnlocked);
  const [data, setData] = useState<FollowingTokenPositionsResponse | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!assetId || !isUnlocked || !enabled) {
      setData(undefined);
      return undefined;
    }

    const controller = new AbortController();
    setIsLoading(true);

    fetchFollowingTokenPositions(assetId, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setData(response);
        setError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err);
        setData(undefined);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [assetId, isUnlocked, enabled]);

  return { data, isLoading, error };
};

export default useFollowingTokenPositions;
