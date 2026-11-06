import { useEffect, useState } from 'react';

import {
  hasVisitedLimitTab as getHasVisitedLimitTab,
  subscribeToLimitTabVisited,
} from './limitTabVisit';

/**
 * Keeps the Limit discovery dot visible until the first time the Limit tab is
 * opened. The visit flag is read synchronously so a returning visit does not
 * flash the dot.
 */
export const useLimitTabNewDot = (isLimitTabEnabled: boolean): boolean => {
  const [hasVisitedLimitTab, setHasVisitedLimitTab] = useState(
    getHasVisitedLimitTab,
  );

  useEffect(() => {
    if (!isLimitTabEnabled) {
      return;
    }

    return subscribeToLimitTabVisited(setHasVisitedLimitTab);
  }, [isLimitTabEnabled]);

  return isLimitTabEnabled && !hasVisitedLimitTab;
};
