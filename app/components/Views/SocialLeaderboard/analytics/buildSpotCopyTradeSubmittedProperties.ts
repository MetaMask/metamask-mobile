import { SocialEvent } from './socialEvents';

/**
 * Properties of `Social Copy Trade Submitted` for a spot (Quick Buy) copy
 * trade. Quick Buy's `trade_type` is the side (`buy` | `sell`), so it is sent
 * as `side` here. `trade_type` is `spot`, which keeps spot and perps apart.
 *
 * @param props - The Quick Buy trade-submitted properties and shared props.
 * @returns The event properties, or `null` when the trade is not a copy trade.
 */
export function buildSpotCopyTradeSubmittedProperties(
  props: Record<string, unknown>,
): Record<string, string | number | boolean> | null {
  if (props.is_copy_trade !== true) {
    return null;
  }
  const properties: Record<string, string | number | boolean> = {
    trade_type: SocialEvent.Trade.SPOT,
  };
  if (props.trade_type === 'buy' || props.trade_type === 'sell') {
    properties.side = props.trade_type;
  }
  if (typeof props.caip19 === 'string') {
    properties.caip19 = props.caip19;
  }
  if (typeof props.source === 'string') {
    properties.source = props.source;
  }
  if (typeof props.post_id === 'string') {
    properties.post_id = props.post_id;
  }
  if (typeof props.author_trader_id === 'string') {
    properties.author_trader_id = props.author_trader_id;
  }
  if (typeof props.amount_usd === 'number') {
    properties.amount_usd = props.amount_usd;
  }
  if (typeof props.metamask_fee_usd === 'number') {
    properties.metamask_fee = props.metamask_fee_usd;
  }
  return properties;
}
