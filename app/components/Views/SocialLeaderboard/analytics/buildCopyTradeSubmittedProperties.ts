import {
  SocialEvent,
  getSocialEventSource,
  type SocialScreenName,
  type SocialUIInteractionProperties,
} from './socialEvents';

/**
 * Screen that matches the copy-trade tap for the same surface. Token and
 * perps detail taps are recorded on the trending screen with their own source.
 */
export function copyTradeScreenForSource(
  source: string | undefined,
): SocialScreenName {
  switch (getSocialEventSource(source)) {
    case SocialEvent.Source.SOCIAL_FOLLOWING:
      return SocialEvent.Screen.FOLLOWING;
    case SocialEvent.Source.SOCIAL_LIVE_TRADES:
      return SocialEvent.Screen.LIVE_TRADES;
    case SocialEvent.Source.TRADER_PROFILE:
      return SocialEvent.Screen.TRADER_PROFILE;
    default:
      return SocialEvent.Screen.TRENDING;
  }
}

/**
 * Social UI Interaction payload for a copied perps order that was accepted.
 * Perp Trade Transaction is emitted by the perps controller and drops unknown
 * tracking fields, so the copy flag has to ride on this event.
 */
export function buildCopyTradeSubmittedProperties(input: {
  source?: string;
  asset: string;
  direction: 'long' | 'short';
  amountUsd?: number;
  metamaskFeeUsd?: number;
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
  };
}
