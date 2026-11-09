import { useEffect, useState } from 'react';

import {
  hasVisitedLimitTab,
  markLimitTabVisited,
  subscribeToLimitTabVisited,
} from './limitTabVisit';

interface UseLimitTabNewDotParams {
  isLimitTabEnabled: boolean;
  isLimitTabOpen: boolean;
}

/**
 * Shows the Limit discovery dot until the Limit tab is first opened, then
 * persists the visit so the dot stays hidden on later app launches. The visit
 * is read synchronously so a returning user never sees the dot flash.
 */
export const useLimitTabNewDot = ({
  isLimitTabEnabled,
  isLimitTabOpen,
}: UseLimitTabNewDotParams): boolean => {
  const [hasVisited, setHasVisited] = useState(hasVisitedLimitTab);
  // A Limit deep link while the tab is disabled falls back to Market, so it
  // must not count as a visit.
  const isVisiting = isLimitTabEnabled && isLimitTabOpen;

  useEffect(() => {
    if (!isLimitTabEnabled) {
      return;
    }

    return subscribeToLimitTabVisited(setHasVisited);
  }, [isLimitTabEnabled]);

  useEffect(() => {
    if (isVisiting) {
      markLimitTabVisited();
    }
  }, [isVisiting]);

  return isLimitTabEnabled && !hasVisited;
};
