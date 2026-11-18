import {
  SocialEvent,
  getSocialEventSource,
  type SocialEventSource,
  type SocialScreenName,
  type SocialUIInteractionProperties,
} from './socialEvents';

/**
 * Screens that share a name with the copy-trade source. Sources with no
 * screen stay on trending, which is also the screen for an unknown source.
 */
const COPY_TRADE_SCREEN_BY_SOURCE: Partial<
  Record<SocialEventSource, SocialScreenName>
> = {
  [SocialEvent.Source.SOCIAL_TRENDING]: SocialEvent.Screen.TRENDING,
  [SocialEvent.Source.SOCIAL_FOLLOWING]: SocialEvent.Screen.FOLLOWING,
  [SocialEvent.Source.SOCIAL_LIVE_TRADES]: SocialEvent.Screen.LIVE_TRADES,
  [SocialEvent.Source.TRADER_PROFILE]: SocialEvent.Screen.TRADER_PROFILE,
  [SocialEvent.Source.TRADER_FEED]: SocialEvent.Screen.TRADER_FEED,
  [SocialEvent.Source.LEADERBOARD]: SocialEvent.Screen.LEADERBOARD,
  [SocialEvent.Source.TOKEN_DETAILS_FEED]:
    SocialEvent.Screen.TOKEN_DETAILS_FEED,
  [SocialEvent.Source.TOKEN_DETAILS_HOLDERS]:
    SocialEvent.Screen.TOKEN_DETAILS_HOLDERS,
  [SocialEvent.Source.PERPS_MARKET_FEED]: SocialEvent.Screen.PERPS_MARKET_FEED,
  [SocialEvent.Source.PERPS_MARKET_HOLDERS]:
    SocialEvent.Screen.PERPS_MARKET_HOLDERS,
};

export function copyTradeScreenForSource(
  source: string | undefined,
): SocialScreenName {
  const eventSource = getSocialEventSource(source);
  if (!eventSource) {
    return SocialEvent.Screen.TRENDING;
  }
  return (
    COPY_TRADE_SCREEN_BY_SOURCE[eventSource] ?? SocialEvent.Screen.TRENDING
  );
}

export function buildCopyTradeSubmittedProperties(input: {
  source?: string;
  asset: string;
  direction: 'long' | 'short';
  amountUsd?: number;
  metamaskFeeUsd?: number;
  orderId?: string;
}): SocialUIInteractionProperties {
  const source = getSocialEventSource(input.source);
  return {
    interaction_type: SocialEvent.Interaction.COPY_TRADE_SUBMITTED,
    screen_name: copyTradeScreenForSource(source),
    ...(source ? { source } : {}),
    trade_type: SocialEvent.Trade.PERPS,
    asset: input.asset,
    direction:
      input.direction === 'short'
        ? SocialEvent.Direction.SHORT
        : SocialEvent.Direction.LONG,
    ...(input.amountUsd !== undefined ? { amount_usd: input.amountUsd } : {}),
    ...(input.metamaskFeeUsd !== undefined
      ? { metamask_fee: input.metamaskFeeUsd }
      : {}),
    ...(input.orderId ? { order_id: input.orderId } : {}),
  };
}
