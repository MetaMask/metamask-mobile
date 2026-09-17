import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Position as PerpsPosition } from '@metamask/perps-controller';
import type { Position } from '@metamask/social-controllers';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import {
  getPreloadedData,
  hasPreloadedData,
} from '../../../UI/Perps/hooks/stream/hasCachedPerpsData';
import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  useTraderPositions,
  type UseTraderPositionsResult,
} from '../TraderProfileView/hooks/useTraderPositions';
import { mapPerpsControllerPositionToSocialPosition } from './mapPerpsControllerPositionToSocialPosition';

const positionIdentity = (position: Position): string =>
  position.positionId ?? `${position.tokenSymbol}-${position.chain}`;

const mergeOpenPositionsWithWalletPerps = (
  socialOpen: Position[],
  walletPerps: PerpsPosition[],
): Position[] => {
  if (walletPerps.length === 0) {
    return socialOpen;
  }

  const existingKeys = new Set(socialOpen.map(positionIdentity));
  const supplementalPerps = walletPerps
    .map(mapPerpsControllerPositionToSocialPosition)
    .filter((position) => !existingKeys.has(positionIdentity(position)));

  if (supplementalPerps.length === 0) {
    return socialOpen;
  }

  return [...supplementalPerps, ...socialOpen];
};

const readWalletPerpsOpenPositions = (): {
  positions: PerpsPosition[];
  hasCache: boolean;
} => {
  if (!hasPreloadedData('cachedPositions')) {
    return { positions: [], hasCache: false };
  }

  return {
    positions: getPreloadedData<PerpsPosition[]>('cachedPositions') ?? [],
    hasCache: true,
  };
};

/**
 * Composer position picker: social open/closed lists plus wallet perps open
 * positions from PerpsController cache (same source as the Perps portfolio).
 */
export const useComposerSharePositions = (
  address: string,
): UseTraderPositionsResult => {
  const socialPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);
  const perpsProductEnabled = useSelector(selectPerpsEnabledFlag);
  const includeWalletPerps = socialPerpsEnabled && perpsProductEnabled;
  const traderPositions = useTraderPositions(address);
  const [walletPerps, setWalletPerps] = useState<PerpsPosition[]>([]);
  const [isWalletPerpsLoading, setIsWalletPerpsLoading] =
    useState(includeWalletPerps);

  useEffect(() => {
    if (!includeWalletPerps) {
      setWalletPerps([]);
      setIsWalletPerpsLoading(false);
      return;
    }

    const { positions, hasCache } = readWalletPerpsOpenPositions();
    setWalletPerps(positions);
    setIsWalletPerpsLoading(!hasCache);
  }, [includeWalletPerps]);

  const openPositions = useMemo(() => {
    if (!includeWalletPerps) {
      return traderPositions.openPositions;
    }
    return mergeOpenPositionsWithWalletPerps(
      traderPositions.openPositions,
      walletPerps,
    );
  }, [includeWalletPerps, traderPositions.openPositions, walletPerps]);

  const isLoadingOpen =
    traderPositions.isLoadingOpen ||
    (includeWalletPerps &&
      isWalletPerpsLoading &&
      traderPositions.openPositions.length === 0 &&
      openPositions.length === 0);

  return {
    ...traderPositions,
    openPositions,
    isLoadingOpen,
  };
};
