import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { PerpDirection } from '../../../../UI/SocialFeed/utils/perp';
import type { TradeAction } from '../../../../UI/SocialFeed/utils/tradeAction';

const TOOLTIP_PREFIX = 'social_leaderboard.position_sheet.tooltip';

/**
 * i18n key for what a fill did, in trader language. A short's "added" is a
 * sell and its "reduced" a buy back, so perps read the side as well as the
 * lifecycle stage.
 */
export function tradeTooltipActionKey({
  trade,
  action,
  isPerp,
  perpDirection,
}: {
  trade: Pick<Trade, 'direction'>;
  action: TradeAction | undefined;
  isPerp: boolean;
  perpDirection: PerpDirection | null;
}): string {
  if (!action) {
    return `${TOOLTIP_PREFIX}.${trade.direction === 'sell' ? 'sold' : 'bought'}`;
  }
  if (isPerp) {
    if (action === 'closed') return `${TOOLTIP_PREFIX}.perps_closed`;
    const side = perpDirection ?? 'long';
    return `${TOOLTIP_PREFIX}.perps_${side}_${action}`;
  }
  return `${TOOLTIP_PREFIX}.spot_${action}`;
}

/** `Bought back @ $107,469`. */
export function formatTradeTooltipLabel(
  params: Parameters<typeof tradeTooltipActionKey>[0] & { priceLabel: string },
): string {
  return strings(`${TOOLTIP_PREFIX}.label`, {
    action: strings(tradeTooltipActionKey(params)),
    price: params.priceLabel,
  });
}
