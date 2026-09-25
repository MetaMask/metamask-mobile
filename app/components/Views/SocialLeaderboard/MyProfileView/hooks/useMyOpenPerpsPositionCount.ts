import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/perps-controller';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { getPreloadedData } from '../../../../UI/Perps/hooks/stream/hasCachedPerpsData';

const readOpenCount = (perpsEnabled: boolean): number => {
  if (!perpsEnabled) {
    return 0;
  }
  return getPreloadedData<Position[]>('cachedPositions')?.length ?? 0;
};

/**
 * Open Hyperliquid perps on the selected wallet (PerpsController cache).
 * Same snapshot the composer uses — no SocialService positions fetch.
 */
export const useMyOpenPerpsPositionCount = (): number => {
  const perpsEnabled = useSelector(selectPerpsEnabledFlag);
  const [count, setCount] = useState(() => readOpenCount(perpsEnabled));

  useEffect(() => {
    setCount(readOpenCount(perpsEnabled));
  }, [perpsEnabled]);

  return count;
};
