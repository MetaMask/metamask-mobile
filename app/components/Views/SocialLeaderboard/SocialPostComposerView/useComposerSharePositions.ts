import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  getPerpsDisplaySymbol,
  type Position as PerpsPosition,
} from '@metamask/perps-controller';
import type { Position } from '@metamask/social-controllers';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { getPreloadedData } from '../../../UI/Perps/hooks/stream/hasCachedPerpsData';
import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  useTraderPositions,
  type UseTraderPositionsResult,
} from '../TraderProfileView/hooks/useTraderPositions';
import { isPerpPosition } from '../utils/perp';
import { mapPerpsControllerPositionToSocialPosition } from './mapPerpsControllerPositionToSocialPosition';

const perpSymbolKey = (symbol: string): string =>
  getPerpsDisplaySymbol(symbol).toLowerCase();

const mergeOpenPositionsWithWalletPerps = (
  socialOpen: Position[],
  walletPerps: PerpsPosition[],
): Position[] => {
  if (walletPerps.length === 0) {
    return socialOpen;
  }

  // Wallet rows carry a synthetic `perps-local-` id, so a social row for the
  // same open perp never matches on `positionId`. Both sides do agree on the
  // display symbol, which is unique per open perp position.
  const socialPerpSymbols = new Set(
    socialOpen
      .filter(isPerpPosition)
      .map((position) => perpSymbolKey(position.tokenSymbol)),
  );
  const supplementalPerps = walletPerps
    .filter(
      (position) => !socialPerpSymbols.has(perpSymbolKey(position.symbol)),
    )
    .map(mapPerpsControllerPositionToSocialPosition);

  if (supplementalPerps.length === 0) {
    return socialOpen;
  }

  return [...supplementalPerps, ...socialOpen];
};

const readWalletPerpsOpenPositions = (): PerpsPosition[] =>
  getPreloadedData<PerpsPosition[]>('cachedPositions') ?? [];

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

  // The PerpsController cache is a synchronous snapshot with nothing to
  // subscribe to, so an empty read is an answer ("no wallet perps"), never a
  // pending one — treating it as loading would leave the picker on skeletons.
  useEffect(() => {
    setWalletPerps(includeWalletPerps ? readWalletPerpsOpenPositions() : []);
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

  return {
    ...traderPositions,
    openPositions,
  };
};
