import type { QuickBuyTarget } from '../../QuickBuy/types';
import type { SocialV1FeedItem } from '../types';
import { chainNameToId } from './chainMapping';

/**
 * Whether a reader can still copy this post's trade. Only open positions can:
 * a closed one no longer exists to mirror. Composer spot shares carry their own
 * flag, because the composer can share a position that has since closed.
 */
export const isCopyTradeable = (item: SocialV1FeedItem): boolean => {
  if (item.variant === 'spotShare') {
    return Boolean(item.showCopyTrade);
  }
  if (item.variant === 'perpsOpen') {
    return item.showCopyTrade !== false;
  }
  return item.variant === 'spotOpen';
};

/**
 * The QuickBuy target a spot copy trade buys into. Undefined for perps, which
 * copy through the Perps order sheet, and for a token whose chain or address
 * QuickBuy cannot resolve.
 */
export const toSpotCopyTradeTarget = (
  item: SocialV1FeedItem,
): QuickBuyTarget | undefined => {
  if (item.variant !== 'spotOpen' && item.variant !== 'spotShare') {
    return undefined;
  }
  const chain = chainNameToId(item.asset.avatar.chain);
  const tokenAddress = item.asset.avatar.tokenAddress.trim();
  if (!chain || !tokenAddress) {
    return undefined;
  }
  return {
    tokenAddress,
    tokenSymbol: item.asset.symbol,
    tokenName: item.asset.name ?? item.asset.symbol,
    chain,
  };
};
