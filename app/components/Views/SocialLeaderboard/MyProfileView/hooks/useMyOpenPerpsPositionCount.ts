import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { getPreloadedData } from '../../../../UI/Perps/hooks/stream/hasCachedPerpsData';

const readOpenCount = (perpsEnabled: boolean): number => {
  if (!perpsEnabled) {
    return 0;
  }
  return getPreloadedData<Position[]>('cachedPositions')?.length ?? 0;
};

/**
 * Open Hyperliquid perps on the selected wallet.
 * Seeds from the PerpsController cache, then follows subscribeToPositions so
 * the owner stats sheet does not freeze on the mount snapshot.
 */
export const useMyOpenPerpsPositionCount = (): number => {
  const perpsEnabled = useSelector(selectPerpsEnabledFlag);
  const [count, setCount] = useState(() => readOpenCount(perpsEnabled));

  useEffect(() => {
    setCount(readOpenCount(perpsEnabled));
    if (!perpsEnabled) {
      return;
    }

    const unsubscribe = Engine.context.PerpsController?.subscribeToPositions({
      callback: (positions) => {
        setCount(positions.length);
      },
    });

    return () => {
      unsubscribe?.();
    };
  }, [perpsEnabled]);

  return count;
};
