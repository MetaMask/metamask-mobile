import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import { isPerpTrade } from '../../utils/perp';

export function getTradeActionLabel(trade: Trade): string {
  const isEntry = trade.intent === 'enter';
  const isPerp = isPerpTrade(trade);

  if (isPerp) {
    return isEntry
      ? strings('social_leaderboard.trader_position.opened')
      : strings('social_leaderboard.trader_position.closed_action');
  }

  return isEntry
    ? strings('social_leaderboard.trader_position.bought')
    : strings('social_leaderboard.trader_position.sold');
}
