import type { TrendingAsset } from '@metamask/assets-controllers';
import type { WatchlistTokenWithBalance } from '../../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { mapWatchlistTokenToTrendingAsset } from './mapWatchlistTokenToTrendingAsset';

export const toWatchlistDisplayTokens = (
  tokens: WatchlistTokenWithBalance[],
  limit?: number,
): TrendingAsset[] => {
  const reversed = tokens.slice().reverse();
  const capped = limit === undefined ? reversed : reversed.slice(0, limit);
  return capped.map(mapWatchlistTokenToTrendingAsset);
};
